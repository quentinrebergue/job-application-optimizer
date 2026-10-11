import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { describeIssue, readJson } from './read-json'

const schema = z.object({ title: z.string().min(1).max(10), tags: z.array(z.string().max(3)).max(2).optional() })
const post = (body: string, headers: Record<string, string> = {}) =>
  new Request('http://x', { method: 'POST', body, headers: { 'content-type': 'application/json', ...headers } })

describe('readJson', () => {
  it('returns the data of a valid body, without the keys the schema does not know', async () => {
    const result = await readJson(post('{"title":"ok","extra":1}'), schema)
    expect(result).toEqual({ ok: true, data: { title: 'ok' } })
  })

  it('answers 400 to a body that is not JSON', async () => {
    const result = await readJson(post('nope'), schema)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.response.status).toBe(400)
  })

  it('answers 413 before parsing a body over the limit, with a message for the user', async () => {
    const result = await readJson(post('{"title":"' + 'a'.repeat(200) + '"}'), schema, 100)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.response.status).toBe(413)
      expect(await result.response.json()).toMatchObject({ code: 'body_too_large', error: expect.stringContaining('too large') })
    }
  })

  it('refuses on the declared length without reading the body', async () => {
    const result = await readJson(post('{}', { 'content-length': '999999' }), schema, 100)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.response.status).toBe(413)
  })

  it('accepts a body of exactly the limit', async () => {
    const body = '{"title":"ok"}'
    expect((await readJson(post(body), schema, body.length)).ok).toBe(true)
  })

  it('answers 400 with the field and its limit when a text is too long', async () => {
    const result = await readJson(post('{"title":"01234567890"}'), schema)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.response.status).toBe(400)
      expect(await result.response.json()).toMatchObject({ error: 'Title is too long: 10 characters at most.' })
    }
  })
})

describe('readJson: the type of the body (#206)', () => {
  // The three types an HTML form can send: a page of another site could use them to fake a JSON body.
  it.each(['text/plain', 'text/plain;charset=UTF-8', 'application/x-www-form-urlencoded', 'multipart/form-data; boundary=x', 'TEXT/PLAIN'])(
    'refuses %s with 415, without reading the body',
    async (type) => {
      const result = await readJson(post('{"title":"ok"}', { 'content-type': type }), schema)
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.response.status).toBe(415)
        expect(await result.response.json()).toMatchObject({ code: 'unsupported_media_type' })
      }
    },
  )

  it.each(['application/json', 'application/json; charset=utf-8', 'application/vnd.api+json'])('accepts %s', async (type) => {
    expect((await readJson(post('{"title":"ok"}', { 'content-type': type }), schema)).ok).toBe(true)
  })

  it('does not reject a body with no type at all (a client that sends none)', async () => {
    const request = new Request('http://x', { method: 'POST', body: new Blob(['{"title":"ok"}']) })
    expect((await readJson(request, schema)).ok).toBe(true)
  })
})

describe('describeIssue', () => {
  const first = (value: unknown) => {
    const parsed = schema.safeParse(value)
    if (parsed.success) throw new Error('expected an error')
    return describeIssue(parsed.error.issues[0])
  }

  it('says a required field is missing or empty', () => {
    expect(first({})).toBe('Title is missing or not valid.')
    expect(first({ title: '' })).toBe('Title is required.')
  })

  it('names the list and the limit for too many items or a too long item', () => {
    expect(first({ title: 'a', tags: ['a', 'b', 'c'] })).toBe('Tags has too many items: 2 at most.')
    expect(first({ title: 'a', tags: ['abcd'] })).toBe('An item of Tags is too long: 3 characters at most.')
  })

  it('writes the limit with a thousands separator', () => {
    const big = z.object({ description: z.string().max(15000) })
    const parsed = big.safeParse({ description: 'a'.repeat(15001) })
    if (parsed.success) throw new Error('expected an error')
    expect(describeIssue(parsed.error.issues[0])).toBe('Description is too long: 15,000 characters at most.')
  })
})
