import { describe, it, expect, vi, beforeEach } from 'vitest'

const consumeRateLimit = vi.fn()
vi.mock('@/lib/db', () => ({ pool: { query: vi.fn() } }))
vi.mock('next/headers', () => ({ headers: async () => new Headers({ 'x-real-ip': '203.0.113.7' }) }))
vi.mock('@/lib/rate-limit', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/rate-limit')>()),
  consumeRateLimit: (...a: unknown[]) => consumeRateLimit(...a),
}))

const { POST, readReports } = await import('./route')

const post = (body: unknown, headers: Record<string, string> = {}) =>
  POST(new Request('http://x/api/csp-report', { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body), headers }))

beforeEach(() => {
  consumeRateLimit.mockReset().mockResolvedValue({ allowed: true, retryAfterMs: 0, count: 1 })
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

describe('readReports', () => {
  it('reads the report-uri format', () => {
    const body = { 'csp-report': { 'effective-directive': 'script-src-elem', 'blocked-uri': 'https://evil.test/x.js?token=1', 'document-uri': 'https://fastresume.tech/jobs?next=a#b', 'source-file': 'https://fastresume.tech/_next/a.js' } }
    expect(readReports(body)).toEqual([{ directive: 'script-src-elem', blocked: 'https://evil.test/x.js', page: 'https://fastresume.tech/jobs', source: 'https://fastresume.tech/_next/a.js' }])
  })

  it('reads the Reporting API format, a list', () => {
    const body = [{ type: 'csp-violation', body: { effectiveDirective: 'style-src', blockedURL: 'inline', documentURL: 'https://fastresume.tech/' } }]
    expect(readReports(body)).toEqual([{ directive: 'style-src', blocked: 'inline', page: 'https://fastresume.tech/', source: undefined }])
  })

  it('drops the query and the fragment of a URL, which can hold a token, and cuts a long one', () => {
    const [r] = readReports({ 'csp-report': { 'blocked-uri': `https://x.test/${'a'.repeat(500)}?secret=1` } })
    expect(r.blocked!.length).toBeLessThanOrEqual(200)
    expect(r.blocked).not.toContain('secret')
  })

  it('ignores what it does not understand', () => {
    expect(readReports(null)).toEqual([])
    expect(readReports('x')).toEqual([])
    expect(readReports([1, null, 'a'])).toEqual([])
    expect(readReports({ 'csp-report': 'nope' })).toEqual([])
  })
})

describe('POST /api/csp-report', () => {
  const report = { 'csp-report': { 'effective-directive': 'script-src-elem', 'blocked-uri': 'inline', 'document-uri': 'https://fastresume.tech/login' } }

  it('logs one short line and answers 204', async () => {
    const res = await post(report)
    expect(res.status).toBe(204)
    expect(console.warn).toHaveBeenCalledWith('csp violation', { directive: 'script-src-elem', blocked: 'inline', page: 'https://fastresume.tech/login', source: undefined })
  })

  it('answers 204 to anything, so it gives nothing away', async () => {
    for (const body of ['not json', '', '[]', 'null', '{"csp-report": 5}']) expect((await post(body)).status).toBe(204)
    expect(console.warn).not.toHaveBeenCalled()
  })

  it('ignores a body that is too big, without reading it', async () => {
    const res = await post(report, { 'content-length': String(1024 * 1024) })
    expect(res.status).toBe(204)
    expect(console.warn).not.toHaveBeenCalled()
  })

  it('logs nothing once an address has sent too many', async () => {
    consumeRateLimit.mockResolvedValue({ allowed: false, retryAfterMs: 1000, count: 31 })
    expect((await post(report)).status).toBe(204)
    expect(console.warn).not.toHaveBeenCalled()
    expect(consumeRateLimit.mock.calls[0][0]).toBe('csp-report:203.0.113.7')
  })

  it('logs at most five reports of one request', async () => {
    const many = Array.from({ length: 20 }, () => ({ type: 'csp-violation', body: { effectiveDirective: 'img-src' } }))
    await post(many)
    expect(console.warn).toHaveBeenCalledTimes(5)
  })
})
