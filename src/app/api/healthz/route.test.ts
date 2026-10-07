import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const query = vi.fn()
vi.mock('@/lib/db', () => ({ pool: { query: (...a: unknown[]) => query(...a) } }))

const { GET } = await import('./route')

beforeEach(() => {
  query.mockReset()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => vi.useRealTimers())

describe('GET /api/healthz', () => {
  it('answers 200 when the database answers', async () => {
    query.mockResolvedValue({ rows: [{ '?column?': 1 }] })
    const res = await GET()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ status: 'ok' })
    expect(res.headers.get('Cache-Control')).toBe('no-store')
  })

  it('answers 503 when the query fails, without the error in the body', async () => {
    query.mockRejectedValue(new Error('connection refused to 10.0.0.1'))
    const res = await GET()
    expect(res.status).toBe(503)
    expect(await res.json()).toEqual({ status: 'unavailable' })
  })

  it('answers 503 when the database does not answer in time', async () => {
    vi.useFakeTimers()
    query.mockReturnValue(new Promise(() => {}))
    const pending = GET()
    await vi.advanceTimersByTimeAsync(2000)
    expect((await pending).status).toBe(503)
  })
})
