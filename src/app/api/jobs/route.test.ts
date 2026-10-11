import { describe, it, expect, vi, beforeEach } from 'vitest'

const createJob = vi.fn()
const countJobs = vi.fn()
vi.mock('@/lib/data', () => ({ listJobs: vi.fn(), createJob: (...a: unknown[]) => createJob(...a), countJobs: (...a: unknown[]) => countJobs(...a) }))
const consumeRateLimit = vi.fn()
vi.mock('@/lib/rate-limit', () => ({ consumeRateLimit: (...a: unknown[]) => consumeRateLimit(...a) }))
vi.mock('@/lib/auth/session', () => ({ getSessionUserId: vi.fn().mockResolvedValue('u1') }))

const { POST } = await import('./route')

const send = (body: unknown) => POST(new Request('http://x', { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body), headers: { 'content-type': 'application/json' } }))
const job = { title: 'Dev', company: 'Acme', description: 'Build things', status: 'saved' }

beforeEach(() => {
  createJob.mockReset().mockResolvedValue({ id: 'job-1' })
  countJobs.mockReset().mockResolvedValue(0)
  consumeRateLimit.mockReset().mockResolvedValue({ allowed: true, retryAfterMs: 0 })
})

describe('POST /api/jobs', () => {
  it('saves a valid job, with an empty list of tags when none is sent', async () => {
    const res = await send(job)
    expect(res.status).toBe(201)
    expect(createJob).toHaveBeenCalledWith('u1', { ...job, tags: [] })
  })

  it('refuses a description over the limit and says which field and how much (#201)', async () => {
    const res = await send({ ...job, description: 'a'.repeat(12001) })
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'Description is too long: 12,000 characters at most.' })
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

describe('POST /api/jobs: how many and how fast (#202)', () => {
  it('refuses a job when the user is at the cap, without counting it against the rate', async () => {
    countJobs.mockResolvedValue(40)
    const res = await send(job)
    expect(res.status).toBe(403)
    expect(await res.json()).toMatchObject({ code: 'limit_reached', error: 'You have reached the limit of 40 jobs. Delete one to add another.' })
    expect(createJob).not.toHaveBeenCalled()
    expect(consumeRateLimit).not.toHaveBeenCalled()
  })

  it('accepts the job just under the cap', async () => {
    countJobs.mockResolvedValue(39)
    expect((await send(job)).status).toBe(201)
  })

  it('counts every creation per hour and per day, for this user', async () => {
    await send(job)
    expect(consumeRateLimit.mock.calls.map((c) => c.slice(0, 3))).toEqual([
      ['create:job:u1:hour', 15, 3_600_000],
      ['create:job:u1:day', 40, 86_400_000],
    ])
  })

  it('answers 429 with the wait when a limit is over, and creates nothing', async () => {
    consumeRateLimit.mockResolvedValue({ allowed: false, retryAfterMs: 12 * 60_000 })
    const res = await send(job)
    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBe('720')
    expect(await res.json()).toMatchObject({ code: 'rate_limited', error: 'Too many jobs in a short time (15 per hour). Try again in 12 minutes.' })
    expect(createJob).not.toHaveBeenCalled()
  })

  it('does not count a request that is refused as invalid', async () => {
    await send({ ...job, title: '' })
    expect(consumeRateLimit).not.toHaveBeenCalled()
    expect(countJobs).not.toHaveBeenCalled()
  })
})
