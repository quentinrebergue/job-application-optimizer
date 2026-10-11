import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const consumeRateLimit = vi.fn()
vi.mock('@/lib/rate-limit', () => ({ consumeRateLimit: (...a: unknown[]) => consumeRateLimit(...a) }))

const { consumeCreation, quotas, waitFor } = await import('./quotas')

beforeEach(() => {
  consumeRateLimit.mockReset().mockResolvedValue({ allowed: true, retryAfterMs: 0 })
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})
afterEach(() => vi.unstubAllEnvs())

describe('quotas', () => {
  it('has generous defaults', () => {
    expect(quotas()).toMatchObject({ maxJobs: 40 })
    expect(quotas().perHour).toEqual({ job: 15, entity: 30, pdf: 30 })
    expect(quotas().perDay).toEqual({ job: 40, entity: 100, pdf: 100 })
  })

  it('reads a number from the environment', () => {
    vi.stubEnv('MAX_JOBS', '10')
    vi.stubEnv('JOBS_PER_HOUR', '5')
    expect(quotas().maxJobs).toBe(10)
    expect(quotas().perHour.job).toBe(5)
  })

  it.each(['', 'abc', '0', '-3', '2.5'])('ignores %j, so a typo cannot switch a limit off', (value) => {
    vi.stubEnv('MAX_JOBS', value)
    expect(quotas().maxJobs).toBe(40)
  })
})

describe('consumeCreation', () => {
  it('lets the creation through when both windows allow it', async () => {
    expect(await consumeCreation('u1', 'pdf')).toBeNull()
    expect(consumeRateLimit).toHaveBeenCalledTimes(2)
  })

  it('stops at the hour without counting the day', async () => {
    consumeRateLimit.mockResolvedValueOnce({ allowed: false, retryAfterMs: 60_000 })
    const res = await consumeCreation('u1', 'pdf')
    expect(res?.status).toBe(429)
    expect(consumeRateLimit).toHaveBeenCalledTimes(1)
  })

  it('names the day when it is the day that is over', async () => {
    consumeRateLimit
      .mockResolvedValueOnce({ allowed: true, retryAfterMs: 0 })
      .mockResolvedValueOnce({ allowed: false, retryAfterMs: 5 * 3_600_000 })
    const res = await consumeCreation('u1', 'job')
    expect(await res?.json()).toMatchObject({ error: 'Too many jobs in a short time (40 per day). Try again in about 5 hours.' })
  })

  it('keeps the counters of two users apart', async () => {
    await consumeCreation('u1', 'job')
    await consumeCreation('u2', 'job')
    expect(consumeRateLimit.mock.calls.map((c) => c[0])).toEqual([
      'create:job:u1:hour', 'create:job:u1:day', 'create:job:u2:hour', 'create:job:u2:day',
    ])
  })
})

describe('waitFor', () => {
  it.each([
    [1000, '1 minute'],
    [61_000, '2 minutes'],
    [59 * 60_000, '59 minutes'],
    [90 * 60_000, 'about 2 hours'],
    [3 * 3_600_000, 'about 3 hours'],
  ])('writes %i ms as %s', (ms, text) => expect(waitFor(ms)).toBe(text))
})
