import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const query = vi.fn()
vi.mock('@/lib/db', () => ({ pool: { query: (...a: unknown[]) => query(...a) } }))
const consumeRateLimit = vi.fn()
const refundRateLimit = vi.fn()
const deleteExpiredRateLimits = vi.fn()
vi.mock('@/lib/rate-limit', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/rate-limit')>()),
  consumeRateLimit: (...a: unknown[]) => consumeRateLimit(...a),
  refundRateLimit: (...a: unknown[]) => refundRateLimit(...a),
  deleteExpiredRateLimits: (...a: unknown[]) => deleteExpiredRateLimits(...a),
}))

const { beginLoginAttempt, loginLimits, purgeExpiredLoginRecords, resetLoginPurge, resetLoginWarning } = await import('./login-limit')

const NOW = new Date('2026-10-12T12:00:00Z')
const PUBLIC = '203.0.113.7'
const EMAIL = 'ada@example.test'

/** What the counter of the address answers: its count after this attempt. */
const ipCount = (count: number, limit = 60) => consumeRateLimit.mockResolvedValue({ allowed: count <= limit, count, retryAfterMs: 10 * 60_000 })
/** What the counter of the email answers: its count after this attempt. */
const emailCount = (count: number) => query.mockResolvedValue({ rows: [{ count }] })

beforeEach(() => {
  consumeRateLimit.mockReset()
  refundRateLimit.mockReset().mockResolvedValue(undefined)
  deleteExpiredRateLimits.mockReset().mockResolvedValue(0)
  query.mockReset()
  ipCount(1)
  emailCount(1)
  resetLoginWarning()
  resetLoginPurge()
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})
afterEach(() => vi.unstubAllEnvs())

describe('loginLimits', () => {
  it('lets a class of thirty in: 60 failures an hour per address by default, and reads the environment', () => {
    expect(loginLimits()).toEqual({ perIpHour: 60, alertPerHour: 300 })
    vi.stubEnv('LOGIN_FAILS_PER_IP_PER_HOUR', '10')
    vi.stubEnv('LOGIN_FAILS_ALERT_PER_HOUR', 'abc')
    expect(loginLimits()).toEqual({ perIpHour: 10, alertPerHour: 300 })
  })
})

describe('beginLoginAttempt: counting before the password is checked (#225)', () => {
  it('counts the attempt for the address and for the email in one step each, before anything else', async () => {
    const attempt = await beginLoginAttempt(PUBLIC, EMAIL, NOW)
    expect(attempt.ok).toBe(true)
    expect(consumeRateLimit).toHaveBeenCalledWith(`login-fail-ip:${PUBLIC}`, 60, 3_600_000, NOW)
    expect(query.mock.calls[0][0]).toContain('INSERT INTO login_attempts')
    expect(query.mock.calls[0][1][0]).toBe(EMAIL)
  })

  it('keeps the points of a failure and counts it for the site', async () => {
    const attempt = await beginLoginAttempt(PUBLIC, EMAIL, NOW)
    if (!attempt.ok) throw new Error('refused')
    await attempt.finish('failure')
    expect(refundRateLimit).not.toHaveBeenCalled()
    expect(consumeRateLimit).toHaveBeenLastCalledWith('login-fail-all:hour', 300, 3_600_000, NOW)
  })

  it('gives the points back after a success, for the address and for the email: a success never counts', async () => {
    const attempt = await beginLoginAttempt(PUBLIC, EMAIL, NOW)
    if (!attempt.ok) throw new Error('refused')
    query.mockClear()
    await attempt.finish('success')
    expect(refundRateLimit).toHaveBeenCalledWith(`login-fail-ip:${PUBLIC}`, NOW)
    expect(query.mock.calls[0][0]).toContain('UPDATE login_attempts SET count = GREATEST(count - 1, 0)')
    expect(consumeRateLimit).toHaveBeenCalledTimes(1)
  })

  it('gives the points back for an attempt that was cancelled before any password was checked (a busy server)', async () => {
    const attempt = await beginLoginAttempt(PUBLIC, EMAIL, NOW)
    if (!attempt.ok) throw new Error('refused')
    query.mockClear()
    await attempt.finish('cancelled')
    expect(refundRateLimit).toHaveBeenCalledWith(`login-fail-ip:${PUBLIC}`, NOW)
    expect(query.mock.calls[0][0]).toContain('UPDATE login_attempts SET count = GREATEST(count - 1, 0)')
    expect(consumeRateLimit).toHaveBeenCalledTimes(1)
  })

  it('refuses an address over its limit before the email is even counted, and says how long to wait', async () => {
    ipCount(61)
    const result = await beginLoginAttempt(PUBLIC, EMAIL, NOW)
    expect(result).toEqual({ ok: false, message: expect.stringContaining('Too many failed attempts from your network') })
    expect(result.ok === false && result.message).toContain('10 minutes')
    expect(query).not.toHaveBeenCalled()
  })

  it('logs once, on the first refusal of an address', async () => {
    ipCount(61)
    await beginLoginAttempt(PUBLIC, EMAIL, NOW)
    expect(vi.mocked(console.warn).mock.calls.map((c) => c[0])).toContain('login failure limit reached for an address')
    vi.mocked(console.warn).mockClear()
    ipCount(62)
    await beginLoginAttempt(PUBLIC, EMAIL, NOW)
    expect(console.warn).not.toHaveBeenCalled()
  })

  it('refuses an email over its 5 failures, and does not charge the address for it: no password was tried', async () => {
    emailCount(6)
    const result = await beginLoginAttempt(PUBLIC, EMAIL, NOW)
    expect(result).toEqual({ ok: false, message: 'Too many attempts. Try again in 15 minutes.' })
    expect(refundRateLimit).toHaveBeenCalledWith(`login-fail-ip:${PUBLIC}`, NOW)
    // The refused attempt is given back to the email too, or a burst would keep the account locked with no failure behind it.
    expect(query.mock.calls.at(-1)![0]).toContain('UPDATE login_attempts SET count = GREATEST(count - 1, 0)')
  })

  it('allows exactly 5 attempts on an email, and refuses the 6th', async () => {
    emailCount(5)
    expect((await beginLoginAttempt(PUBLIC, EMAIL, NOW)).ok).toBe(true)
    emailCount(6)
    expect((await beginLoginAttempt(PUBLIC, EMAIL, NOW)).ok).toBe(false)
  })

  it('treats one IPv6 /64 as one address', async () => {
    await beginLoginAttempt('2001:db8:1:2:aaaa::1', EMAIL, NOW)
    await beginLoginAttempt('2001:db8:1:2:bbbb::9', EMAIL, NOW)
    expect(consumeRateLimit.mock.calls[0][0]).toBe('login-fail-ip:2001:db8:1:2::/64')
    expect(consumeRateLimit.mock.calls[1][0]).toBe(consumeRateLimit.mock.calls[0][0])
  })

  it.each([['a private address', '10.2.0.1'], ['the carrier-grade network', '100.64.0.5'], ['no address', null]])(
    'never limits %s per address (it is shared by every visitor), says so once, and still counts the email',
    async (_name, ip) => {
      const first = await beginLoginAttempt(ip, EMAIL, NOW)
      await beginLoginAttempt(ip, EMAIL, NOW)
      expect(first.ok).toBe(true)
      expect(consumeRateLimit).not.toHaveBeenCalled()
      expect(query).toHaveBeenCalledTimes(2)
      expect(vi.mocked(console.warn).mock.calls).toHaveLength(1)
      expect(vi.mocked(console.warn).mock.calls[0][0]).toContain('per-address limit is off')
    },
  )

  it('does not refund an address it never counted, after a success or a refused email', async () => {
    const attempt = await beginLoginAttempt('10.2.0.1', EMAIL, NOW)
    if (!attempt.ok) throw new Error('refused')
    await attempt.finish('success')
    emailCount(6)
    await beginLoginAttempt('10.2.0.1', EMAIL, NOW)
    expect(refundRateLimit).not.toHaveBeenCalled()
  })

  it('reports a surge of failures on the whole site once, on the failure that crosses the line, and blocks nobody', async () => {
    consumeRateLimit.mockImplementation(async (key: string) => ({ allowed: true, count: key === 'login-fail-all:hour' ? 301 : 1, retryAfterMs: 1000 }))
    const attempt = await beginLoginAttempt(PUBLIC, EMAIL, NOW)
    if (!attempt.ok) throw new Error('refused')
    await attempt.finish('failure')
    expect(vi.mocked(console.warn).mock.calls.map((c) => c[0])).toContain('login failure surge: more failed logins this hour than usual')
    consumeRateLimit.mockImplementation(async (key: string) => ({ allowed: true, count: key === 'login-fail-all:hour' ? 302 : 1, retryAfterMs: 1000 }))
    vi.mocked(console.warn).mockClear()
    await attempt.finish('failure')
    expect(console.warn).not.toHaveBeenCalled()
  })
})

describe('purgeExpiredLoginRecords (#225)', () => {
  it('deletes the counters whose window is over: the addresses and the emails typed', async () => {
    query.mockResolvedValue({ rows: [] })
    await purgeExpiredLoginRecords(NOW)
    expect(deleteExpiredRateLimits).toHaveBeenCalledWith(NOW)
    expect(query.mock.calls[0][0]).toContain('DELETE FROM login_attempts WHERE reset_at <= $1')
  })

  it('runs at most once every five minutes: a failed login must not turn into a delete each time', async () => {
    query.mockResolvedValue({ rows: [] })
    await purgeExpiredLoginRecords(NOW)
    await purgeExpiredLoginRecords(new Date(NOW.getTime() + 4 * 60_000))
    expect(deleteExpiredRateLimits).toHaveBeenCalledTimes(1)
    await purgeExpiredLoginRecords(new Date(NOW.getTime() + 5 * 60_000))
    expect(deleteExpiredRateLimits).toHaveBeenCalledTimes(2)
  })
})
