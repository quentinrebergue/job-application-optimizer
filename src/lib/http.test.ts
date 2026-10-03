import { describe, it, expect, vi, afterEach } from 'vitest'
import { fetchJson, HttpError } from './http'

afterEach(() => vi.unstubAllGlobals())

function stubFetch(response: Response) {
  const fetchMock = vi.fn(async () => response)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('fetchJson', () => {
  it('returns the JSON body and sends `json` as a JSON body', async () => {
    const fetchMock = stubFetch(new Response(JSON.stringify({ id: 'j1' }), { status: 200 }))
    await expect(fetchJson('/api/jobs', { method: 'POST', json: { title: 'x' } })).resolves.toEqual({ id: 'j1' })
    expect(fetchMock).toHaveBeenCalledWith('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"title":"x"}',
    })
  })

  it("throws the server's error message when the response is not ok", async () => {
    stubFetch(new Response(JSON.stringify({ error: 'Job not found' }), { status: 404 }))
    await expect(fetchJson('/api/jobs/x')).rejects.toEqual(new HttpError('Job not found', 404))
  })

  it('throws a generic message when the error body is not JSON', async () => {
    stubFetch(new Response('Bad gateway', { status: 502 }))
    await expect(fetchJson('/api/jobs/x')).rejects.toThrow('Request failed (502). Try again.')
  })

  it('accepts empty successful responses', async () => {
    stubFetch(new Response(null, { status: 204 }))
    await expect(fetchJson('/api/jobs/x', { method: 'DELETE' })).resolves.toBeUndefined()
  })
})
