import { describe, it, expect, vi, beforeEach } from 'vitest'

const getJob = vi.fn()
const getResumeProfile = vi.fn()
const listEntities = vi.fn()
vi.mock('@/lib/data', () => ({
  getJob: (...a: unknown[]) => getJob(...a),
  getResumeProfile: (...a: unknown[]) => getResumeProfile(...a),
  listEntities: (...a: unknown[]) => listEntities(...a),
}))
vi.mock('@/lib/auth/session', () => ({ getSessionUserId: vi.fn().mockResolvedValue('u1') }))
vi.mock('@/lib/db', () => ({ pool: { query: vi.fn() } }))
const consumeRateLimit = vi.fn()
vi.mock('@/lib/rate-limit', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/rate-limit')>()),
  consumeRateLimit: (...a: unknown[]) => consumeRateLimit(...a),
}))
const buildPayload = vi.fn()
vi.mock('@/lib/resume/build-payload', () => ({ buildPayload: (...a: unknown[]) => buildPayload(...a) }))
const renderPdf = vi.fn()
vi.mock('@/lib/resume/renderer-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/resume/renderer-client')>()),
  renderPdf: (...a: unknown[]) => renderPdf(...a),
}))

const { POST } = await import('./route')
const { RenderError } = await import('@/lib/resume/renderer-client')

const post = (body: unknown, headers: Record<string, string> = { 'content-type': 'application/json' }) =>
  POST(new Request('http://x', { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body), headers }))

const entity = (id: string, type: string) => ({ id, type, title: id })

beforeEach(() => {
  getJob.mockReset().mockResolvedValue({ id: 'job-1', resume_config: { selected_entity_ids: ['exp-1'] } })
  getResumeProfile.mockReset().mockResolvedValue({ full_name: 'Ada Lovelace' })
  listEntities.mockReset().mockImplementation(async (_user: string, type: string) =>
    type === 'experiences' ? [entity('exp-1', 'experiences'), entity('exp-2', 'experiences')] : type === 'projects' ? [entity('proj-1', 'projects')] : [])
  consumeRateLimit.mockReset().mockResolvedValue({ allowed: true, retryAfterMs: 0, count: 1 })
  buildPayload.mockReset().mockReturnValue({ payload: true })
  renderPdf.mockReset().mockResolvedValue(new TextEncoder().encode('%PDF-1.7').buffer)
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

describe('POST /api/resume/generate (#201, #202, #220)', () => {
  it('answers 400 to a body with neither a job nor entries, naming the field, without counting it', async () => {
    const res = await post({})
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Provide a jobId or a list of entityIds')
    expect(consumeRateLimit).not.toHaveBeenCalled()
    expect(renderPdf).not.toHaveBeenCalled()
  })

  it('answers 400 to a template name that is not one, and 415 to what a form can send', async () => {
    expect((await post({ jobId: 'job-1', template: '../etc/passwd' })).status).toBe(400)
    expect((await post(JSON.stringify({ jobId: 'job-1' }), { 'content-type': 'text/plain' })).status).toBe(415)
  })

  it('counts the PDF per hour and per day for this user, and answers 429 with the wait over a limit', async () => {
    await post({ jobId: 'job-1' })
    expect(consumeRateLimit.mock.calls.map((c) => c.slice(0, 3))).toEqual([
      ['create:pdf:u1:hour', 30, 3_600_000],
      ['create:pdf:u1:day', 100, 86_400_000],
    ])
    consumeRateLimit.mockResolvedValueOnce({ allowed: false, retryAfterMs: 12 * 60_000, count: 31 })
    renderPdf.mockClear()
    const res = await post({ jobId: 'job-1' })
    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBe('720')
    expect(await res.json()).toMatchObject({ code: 'rate_limited', error: 'Too many PDFs in a short time (30 per hour). Try again in 12 minutes.' })
    expect(renderPdf).not.toHaveBeenCalled()
  })

  it('asks for the full name before rendering, with a code the interface knows', async () => {
    getResumeProfile.mockResolvedValue({ full_name: '' })
    const res = await post({ jobId: 'job-1' })
    expect(res.status).toBe(422)
    expect(await res.json()).toMatchObject({ code: 'profile_incomplete' })
    expect(renderPdf).not.toHaveBeenCalled()
  })

  it('answers 404 for a job that is not the user\'s: it looks for it with the user of the session', async () => {
    getJob.mockResolvedValue(null)
    expect((await post({ jobId: 'job-9' })).status).toBe(404)
    expect(getJob).toHaveBeenCalledWith('u1', 'job-9')
    expect(renderPdf).not.toHaveBeenCalled()
  })

  it('renders the entries the job selected, read for the user, and answers a PDF to download', async () => {
    const res = await post({ jobId: 'job-1' })
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('application/pdf')
    expect(res.headers.get('Content-Disposition')).toBe('attachment; filename="resume-job-1.pdf"')
    expect(listEntities).toHaveBeenCalledWith('u1', 'experiences')
    const entities = buildPayload.mock.calls[0][0].entities.map((e: { id: string }) => e.id)
    expect(entities).toEqual(['exp-1'])
  })

  it('lets explicit entry ids win over the saved selection of the job', async () => {
    await post({ jobId: 'job-1', entityIds: ['exp-2', 'proj-1'] })
    expect(buildPayload.mock.calls[0][0].entities.map((e: { id: string }) => e.id).sort()).toEqual(['exp-2', 'proj-1'])
  })

  it('passes a failure of the renderer on with its status, its code and what it rejected', async () => {
    renderPdf.mockRejectedValue(new RenderError('The renderer is busy.', 503, 'busy', ['a problem']))
    const res = await post({ jobId: 'job-1' })
    expect(res.status).toBe(503)
    expect(await res.json()).toEqual({ error: 'The renderer is busy.', code: 'busy', problems: ['a problem'] })
  })
})
