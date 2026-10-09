import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { askGateway, AiGatewayError } from './gateway'

const REQUEST = { feature: 'rank' as const, userId: 'u1', system: 's', prompt: 'p' }

const fetchMock = vi.fn()
beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  vi.stubEnv('AI_GATEWAY_URL', 'http://ai-gateway/')
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status })

describe('askGateway', () => {
  it('posts the request to the gateway and returns the content and usage', async () => {
    const usage = { prompt_tokens: 3, completion_tokens: 2 }
    fetchMock.mockResolvedValue(reply(200, { content: { ok: true }, usage }))
    expect(await askGateway(REQUEST)).toEqual({ content: { ok: true }, usage })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://ai-gateway/v1/complete')
    expect(JSON.parse(init.body)).toEqual({ feature: 'rank', user_id: 'u1', system: 's', prompt: 'p' })
  })

  it('sends the schema only when there is one', async () => {
    fetchMock.mockImplementation(async () => reply(200, { content: {}, usage: { prompt_tokens: 1, completion_tokens: 1 } }))
    await askGateway(REQUEST)
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).not.toHaveProperty('schema')
    await askGateway({ ...REQUEST, schema: { type: 'object' } })
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).schema).toEqual({ type: 'object' })
  })

  it('asks for free text only when told to', async () => {
    fetchMock.mockImplementation(async () => reply(200, { content: 'a: 1', usage: { prompt_tokens: 1, completion_tokens: 1 } }))
    expect((await askGateway({ ...REQUEST, format: 'text' })).content).toBe('a: 1')
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).format).toBe('text')
    await askGateway(REQUEST)
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).not.toHaveProperty('format')
  })

  it('refuses to run without a gateway address', async () => {
    vi.stubEnv('AI_GATEWAY_URL', '')
    await expect(askGateway(REQUEST)).rejects.toMatchObject({ status: 503 })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('keeps the gateway message when a limit is reached (429)', async () => {
    fetchMock.mockResolvedValue(reply(429, { error: 'Daily limit reached, back tomorrow.' }))
    await expect(askGateway(REQUEST)).rejects.toMatchObject({ status: 429, message: 'Daily limit reached, back tomorrow.' })
  })

  it.each([
    [504, 'too long'],
    [502, 'unavailable'],
    [413, 'too long to rank'],
  ])('answers %i with a message the user can read', async (status, fragment) => {
    fetchMock.mockResolvedValue(reply(status, { error: 'internal detail' }))
    const error = await askGateway(REQUEST).catch((e) => e)
    expect(error).toBeInstanceOf(AiGatewayError)
    expect(error.status).toBe(status)
    expect(error.message).toContain(fragment)
    expect(error.message).not.toContain('internal detail')
  })

  it('answers 502 when the gateway cannot be reached', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'))
    await expect(askGateway(REQUEST)).rejects.toMatchObject({ status: 502 })
  })

  it('answers 504 when the call times out', async () => {
    fetchMock.mockRejectedValue(Object.assign(new Error('timeout'), { name: 'TimeoutError' }))
    await expect(askGateway(REQUEST)).rejects.toMatchObject({ status: 504 })
  })

  it('answers 502 when a 200 has no content', async () => {
    fetchMock.mockResolvedValue(reply(200, {}))
    await expect(askGateway(REQUEST)).rejects.toMatchObject({ status: 502 })
  })
})
