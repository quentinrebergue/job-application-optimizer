import { describe, it, expect, vi, beforeEach } from 'vitest'

const getJob = vi.fn()
const updateJob = vi.fn()
vi.mock('@/lib/data', () => ({
  getJob: (...a: unknown[]) => getJob(...a),
  updateJob: (...a: unknown[]) => updateJob(...a),
  getResumeProfile: vi.fn().mockResolvedValue({ ai_context: '' }),
  listEntities: vi.fn().mockResolvedValue([]),
}))
const rankJobWithAI = vi.fn()
vi.mock('@/lib/ai', () => ({ rankJobWithAI: (...a: unknown[]) => rankJobWithAI(...a) }))
const findUserById = vi.fn()
vi.mock('@/lib/data/users', () => ({ findUserById: (...a: unknown[]) => findUserById(...a) }))
const getSessionUserId = vi.fn()
vi.mock('@/lib/auth/session', () => ({ getSessionUserId: () => getSessionUserId() }))

const { DELETE, POST } = await import('./route')

const { AiGatewayError } = await import('@/lib/ai/gateway')

const ctx = { params: Promise.resolve({ id: 'job-1' }) }

beforeEach(() => {
  getJob.mockReset().mockResolvedValue({ id: 'job-1', ats_tags: ['go'], ai_analysis: { job_id: 'job-1' } })
  updateJob.mockReset().mockResolvedValue({})
  getSessionUserId.mockReset().mockResolvedValue('u1')
})

describe('DELETE /api/jobs/[id]/rank', () => {
  it('clears the ranking in the database, not in a file (#167)', async () => {
    const res = await DELETE(new Request('http://x'), ctx)
    expect(res.status).toBe(200)
    expect(updateJob).toHaveBeenCalledWith('u1', 'job-1', { ai_analysis: undefined, ats_tags: [] })
  })

  it('answers 404 for a job that is not the user\'s', async () => {
    getJob.mockResolvedValue(null)
    const res = await DELETE(new Request('http://x'), ctx)
    expect(res.status).toBe(404)
    expect(updateJob).not.toHaveBeenCalled()
  })

  it('answers 401 without a session', async () => {
    getSessionUserId.mockResolvedValue(null)
    expect((await DELETE(new Request('http://x'), ctx)).status).toBe(401)
  })
})

describe('POST /api/jobs/[id]/rank', () => {
  const post = () => POST(new Request('http://x', { method: 'POST' }), ctx)

  beforeEach(() => {
    findUserById.mockReset().mockResolvedValue({ emailVerified: true })
    rankJobWithAI.mockReset().mockResolvedValue({ job_id: '', ats_tags: ['go'], summary: 'ok' })
    getJob.mockResolvedValue({ id: 'job-1', title: 'Dev', company: 'Acme', description: 'd', resume_config: {} })
  })

  it('ranks through the gateway for this user and saves the result', async () => {
    const res = await post()
    expect(res.status).toBe(200)
    expect(rankJobWithAI.mock.calls[0][0]).toBe('u1')
    expect(updateJob).toHaveBeenCalledWith('u1', 'job-1', expect.objectContaining({ ats_tags: ['go'], ai_analysis: expect.objectContaining({ job_id: 'job-1' }) }))
  })

  it('refuses an unconfirmed account before calling the AI', async () => {
    findUserById.mockResolvedValue({ emailVerified: false })
    expect((await post()).status).toBe(403)
    expect(rankJobWithAI).not.toHaveBeenCalled()
  })

  it('passes a gateway failure on with its status and message', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    rankJobWithAI.mockRejectedValue(new AiGatewayError('Daily limit reached.', 429))
    const res = await post()
    expect(res.status).toBe(429)
    expect(await res.json()).toEqual({ error: 'Daily limit reached.' })
    expect(updateJob).not.toHaveBeenCalled()
  })
})
