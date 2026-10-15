import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const consumeRateLimit = vi.fn()
vi.mock('@/lib/db', () => ({ pool: { query: vi.fn() } }))
vi.mock('@/lib/rate-limit', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/rate-limit')>()),
  consumeRateLimit: (...a: unknown[]) => consumeRateLimit(...a),
}))

const { checkSignup, signupLimits, resetSignupWarning } = await import('./signup-limit')
const { pool } = await import('@/lib/db')

const NOW = new Date('2026-10-12T10:00:00Z')
const allow = { allowed: true, retryAfterMs: 0, count: 1 }

beforeEach(() => {
  consumeRateLimit.mockReset().mockResolvedValue(allow)
  resetSignupWarning()
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})
afterEach(() => vi.unstubAllEnvs())

describe('signupLimits', () => {
  it('lets a class of thirty sign up together, and stops a loop', () => {
    expect(signupLimits()).toEqual({ perIpHour: 30, perIpDay: 60, alertPerDay: 150, maxPerDay: 1000 })
  })

  it('reads the numbers from the environment', () => {
    vi.stubEnv('SIGNUPS_PER_IP_PER_HOUR', '5')
    vi.stubEnv('SIGNUPS_ALERT_PER_DAY', '50')
    vi.stubEnv('SIGNUPS_MAX_PER_DAY', '300')
    expect(signupLimits()).toMatchObject({ perIpHour: 5, alertPerDay: 50, maxPerDay: 300 })
  })
})

describe('checkSignup', () => {
  it('counts the address per hour and per day, and the whole site per day at its high limit', async () => {
    expect(await checkSignup('203.0.113.7', NOW)).toMatchObject({ ok: true })
    expect(consumeRateLimit.mock.calls.map((c) => c.slice(0, 3))).toEqual([
      ['signup-ip:203.0.113.7:hour', 30, 3_600_000],
      ['signup-ip:203.0.113.7:day', 60, 86_400_000],
      ['signup-all:day', 1000, 86_400_000],
    ])
  })

  it('gives back what it counted (the address by hour and day, and the site) for a sign-up refused for lack of room', async () => {
    const check = await checkSignup('203.0.113.7', NOW)
    if (!check.ok) throw new Error('expected the sign-up to be allowed')
    vi.mocked(pool.query).mockClear()
    await check.giveBack()
    expect(vi.mocked(pool.query).mock.calls.map((c) => (c[1] as unknown[])[0])).toEqual([
      'signup-ip:203.0.113.7:hour',
      'signup-ip:203.0.113.7:day',
      'signup-all:day',
    ])
  })

  it('refuses over the hourly limit of an address, with the wait, and does not count the site', async () => {
    consumeRateLimit.mockResolvedValueOnce({ allowed: false, retryAfterMs: 12 * 60_000, count: 31 })
    expect(await checkSignup('203.0.113.7', NOW)).toEqual({ ok: false, message: 'Too many sign-ups from your network. Try again in 12 minutes.' })
    expect(consumeRateLimit).toHaveBeenCalledTimes(1)
  })

  it('refuses over the daily limit of an address', async () => {
    consumeRateLimit.mockResolvedValueOnce(allow).mockResolvedValueOnce({ allowed: false, retryAfterMs: 5 * 3_600_000, count: 61 })
    expect(await checkSignup('203.0.113.7', NOW)).toEqual({ ok: false, message: 'Too many sign-ups from your network. Try again in about 5 hours.' })
  })

  it('counts an IPv6 visitor by its /64: changing the end of the address does not give a new quota', async () => {
    await checkSignup('2a01:cb00:1:2:aaaa:bbbb:cccc:dddd', NOW)
    await checkSignup('2a01:cb00:1:2:1111:2222:3333:4444', NOW)
    const keys = consumeRateLimit.mock.calls.map((c) => c[0]).filter((k) => String(k).endsWith(':hour'))
    expect(keys).toEqual(['signup-ip:2a01:cb00:1:2::/64:hour', 'signup-ip:2a01:cb00:1:2::/64:hour'])
  })

  it('keeps two addresses apart', async () => {
    await checkSignup('203.0.113.7', NOW)
    await checkSignup('198.51.100.9', NOW)
    const keys = consumeRateLimit.mock.calls.map((c) => c[0])
    expect(keys).toContain('signup-ip:203.0.113.7:hour')
    expect(keys).toContain('signup-ip:198.51.100.9:hour')
  })

  describe('a surge on the whole site', () => {
    const ok = (count: number) => ({ allowed: true, retryAfterMs: 0, count })

    it('is reported once, on the sign-up that crosses the alert line, and nobody is refused', async () => {
      consumeRateLimit.mockResolvedValueOnce(ok(1)).mockResolvedValueOnce(ok(1)).mockResolvedValueOnce(ok(151))
      expect(await checkSignup('203.0.113.7', NOW)).toMatchObject({ ok: true })
      expect(console.warn).toHaveBeenCalledTimes(1)
      expect(vi.mocked(console.warn).mock.calls[0][0]).toContain('sign-up surge')
    })

    it('says nothing before the line and nothing again after it', async () => {
      for (const count of [150, 152, 400]) {
        consumeRateLimit.mockResolvedValueOnce(ok(1)).mockResolvedValueOnce(ok(1)).mockResolvedValueOnce(ok(count))
        expect(await checkSignup('203.0.113.7', NOW)).toMatchObject({ ok: true })
      }
      expect(console.warn).not.toHaveBeenCalled()
    })

    it('refuses only past the high limit, with the wait, and says so once', async () => {
      consumeRateLimit.mockResolvedValueOnce(ok(1)).mockResolvedValueOnce(ok(1)).mockResolvedValueOnce({ allowed: false, retryAfterMs: 3 * 3_600_000, count: 1001 })
      expect(await checkSignup('203.0.113.7', NOW)).toEqual({ ok: false, message: 'Sign-ups are very busy right now. Try again in about 3 hours.' })
      expect(vi.mocked(console.warn).mock.calls.map((c) => c[0])).toContain('sign-up limit reached for the whole site')
    })

    it('takes the line and the limit from the environment', async () => {
      vi.stubEnv('SIGNUPS_ALERT_PER_DAY', '10')
      vi.stubEnv('SIGNUPS_MAX_PER_DAY', '20')
      consumeRateLimit.mockResolvedValueOnce(ok(1)).mockResolvedValueOnce(ok(1)).mockResolvedValueOnce(ok(11))
      await checkSignup('203.0.113.7', NOW)
      expect(consumeRateLimit.mock.calls[2][1]).toBe(20)
      expect(vi.mocked(console.warn).mock.calls[0][0]).toContain('sign-up surge')
    })
  })

  it.each([['a private address (the load balancer)', '10.0.3.4'], ['no address at all', null], ['a loopback address', '127.0.0.1']])(
    'does not limit per address for %s, only for the site, and says so once',
    async (_name, ip) => {
      expect(await checkSignup(ip, NOW)).toMatchObject({ ok: true })
      expect(consumeRateLimit.mock.calls.map((c) => c[0])).toEqual(['signup-all:day'])
      await checkSignup(ip, NOW)
      expect(console.warn).toHaveBeenCalledTimes(1)
      expect(vi.mocked(console.warn).mock.calls[0][0]).toContain('per-address limit is off')
    },
  )

  it('takes the per-address numbers from the environment', async () => {
    vi.stubEnv('SIGNUPS_PER_IP_PER_HOUR', '3')
    await checkSignup('203.0.113.7', NOW)
    expect(consumeRateLimit.mock.calls[0][1]).toBe(3)
  })
})
