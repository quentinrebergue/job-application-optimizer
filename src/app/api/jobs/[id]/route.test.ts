import { describe, it, expect, vi, beforeEach } from 'vitest'

const updateJob = vi.fn()
vi.mock('@/lib/data', () => ({ getJob: vi.fn(), updateJob: (...a: unknown[]) => updateJob(...a), deleteJob: vi.fn() }))
vi.mock('@/lib/auth/session', () => ({ getSessionUserId: vi.fn().mockResolvedValue('u1') }))

const { PUT } = await import('./route')

const ctx = { params: Promise.resolve({ id: 'job-1' }) }
const put = (body: unknown) => PUT(new Request('http://x', { method: 'PUT', body: JSON.stringify(body) }), ctx)

beforeEach(() => updateJob.mockReset().mockResolvedValue({ id: 'job-1' }))

describe('PUT /api/jobs/[id]', () => {
  it('passes on only the field that was sent (the autosave sends one at a time)', async () => {
    expect((await put({ status: 'applied' })).status).toBe(200)
    expect(updateJob).toHaveBeenCalledWith('u1', 'job-1', { status: 'applied' })
  })

  it('refuses a field over its limit, naming it', async () => {
    const res = await put({ title: 'a'.repeat(151) })
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'Title is too long: 150 characters at most.' })
    expect(updateJob).not.toHaveBeenCalled()
  })

  it('does not let the AI results be written through the API', async () => {
    await put({ status: 'saved', ai_analysis: { job_id: 'x' }, ats_tags: ['x'] })
    expect(updateJob).toHaveBeenCalledWith('u1', 'job-1', { status: 'saved' })
  })

  it('answers 404 for a job that is not the user\'s', async () => {
    updateJob.mockResolvedValue(null)
    expect((await put({ status: 'saved' })).status).toBe(404)
  })
})
