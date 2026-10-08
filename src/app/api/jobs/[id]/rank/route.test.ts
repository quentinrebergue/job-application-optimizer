import { describe, it, expect, vi, beforeEach } from 'vitest'

const getJob = vi.fn()
const updateJob = vi.fn()
vi.mock('@/lib/data', () => ({
  getJob: (...a: unknown[]) => getJob(...a),
  updateJob: (...a: unknown[]) => updateJob(...a),
  getResumeProfile: vi.fn(),
  listEntities: vi.fn(),
}))
vi.mock('@/lib/ai', () => ({ rankJobWithAI: vi.fn(), isAIProvider: vi.fn() }))
vi.mock('@/lib/data/users', () => ({ findUserById: vi.fn() }))
const getSessionUserId = vi.fn()
vi.mock('@/lib/auth/session', () => ({ getSessionUserId: () => getSessionUserId() }))

const { DELETE } = await import('./route')

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
