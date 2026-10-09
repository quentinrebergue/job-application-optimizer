import { describe, it, expect, vi, beforeEach } from 'vitest'

const createJob = vi.fn()
vi.mock('@/lib/data', () => ({ listJobs: vi.fn(), createJob: (...a: unknown[]) => createJob(...a) }))
vi.mock('@/lib/auth/session', () => ({ getSessionUserId: vi.fn().mockResolvedValue('u1') }))

const { POST } = await import('./route')

const send = (body: unknown) => POST(new Request('http://x', { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body) }))
const job = { title: 'Dev', company: 'Acme', description: 'Build things', status: 'saved' }

beforeEach(() => createJob.mockReset().mockResolvedValue({ id: 'job-1' }))

describe('POST /api/jobs', () => {
  it('saves a valid job, with an empty list of tags when none is sent', async () => {
    const res = await send(job)
    expect(res.status).toBe(201)
    expect(createJob).toHaveBeenCalledWith('u1', { ...job, tags: [] })
  })

  it('refuses a description over the limit and says which field and how much (#201)', async () => {
    const res = await send({ ...job, description: 'a'.repeat(15001) })
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'Description is too long: 15,000 characters at most.' })
    expect(createJob).not.toHaveBeenCalled()
  })

  it('refuses a body far over the limit with 413 before saving anything', async () => {
    const res = await send({ ...job, description: 'a'.repeat(200 * 1024) })
    expect(res.status).toBe(413)
    expect(await res.json()).toMatchObject({ code: 'body_too_large' })
    expect(createJob).not.toHaveBeenCalled()
  })

  it('refuses a missing field and a body that is not JSON', async () => {
    expect((await send({ ...job, company: '' })).status).toBe(400)
    expect((await send('nope')).status).toBe(400)
    expect(createJob).not.toHaveBeenCalled()
  })

  it('does not pass on what the client must not set', async () => {
    await send({ ...job, id: 'x', ai_analysis: { a: 1 } })
    expect(createJob.mock.calls[0][1]).not.toHaveProperty('ai_analysis')
    expect(createJob.mock.calls[0][1]).not.toHaveProperty('id')
  })
})
