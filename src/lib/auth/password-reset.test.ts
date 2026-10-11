import { describe, it, expect, vi, beforeEach } from 'vitest'

const findUserByEmail = vi.fn()
const findUserById = vi.fn()
const replacePassword = vi.fn()
const countRecentTokens = vi.fn()
const createEmailToken = vi.fn()
const consumeEmailToken = vi.fn()
const peekEmailToken = vi.fn()
const consumeRateLimit = vi.fn()
const sendEmail = vi.fn()
/** Work scheduled with after(), run by the test when it wants. */
let scheduled: (() => unknown)[] = []

vi.mock('server-only', () => ({}))
vi.mock('next/server', () => ({ after: (task: () => unknown) => scheduled.push(task) }))
vi.mock('@/lib/data/users', () => ({
  findUserByEmail: (...a: unknown[]) => findUserByEmail(...a),
  findUserById: (...a: unknown[]) => findUserById(...a),
  replacePassword: (...a: unknown[]) => replacePassword(...a),
}))
vi.mock('@/lib/data/email-tokens', () => ({
  countRecentTokens: (...a: unknown[]) => countRecentTokens(...a),
  createEmailToken: (...a: unknown[]) => createEmailToken(...a),
  consumeEmailToken: (...a: unknown[]) => consumeEmailToken(...a),
  peekEmailToken: (...a: unknown[]) => peekEmailToken(...a),
}))
vi.mock('@/lib/rate-limit', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/rate-limit')>()),
  consumeRateLimit: (...a: unknown[]) => consumeRateLimit(...a),
  deleteExpiredRateLimits: vi.fn(async () => 0),
}))
vi.mock('@/lib/email/send', () => ({ sendEmail: (...a: unknown[]) => sendEmail(...a) }))

const { requestPasswordReset, resetPassword, checkResetToken, resetUrl } = await import('./password-reset')

const NOW = new Date('2026-10-07T12:00:00Z')
const USER = { id: 'u1', email: 'ada@example.test', passwordHash: 'h' }

async function runScheduled() {
  for (const task of scheduled) await task()
}

beforeEach(() => {
  scheduled = []
  for (const fn of [findUserByEmail, findUserById, replacePassword, countRecentTokens, createEmailToken, consumeEmailToken, peekEmailToken, consumeRateLimit, sendEmail]) fn.mockReset()
  findUserByEmail.mockResolvedValue(USER)
  findUserById.mockResolvedValue(USER)
  countRecentTokens.mockResolvedValue({ count: 0, latest: null })
  createEmailToken.mockResolvedValue('tok')
  consumeRateLimit.mockResolvedValue({ allowed: true, retryAfterMs: 0 })
  sendEmail.mockResolvedValue(undefined)
})

describe('requestPasswordReset', () => {
  it('mails a 30-minute reset link after the response', async () => {
    expect(await requestPasswordReset('ada@example.test', '203.0.113.7', NOW)).toBe('sent')
    expect(createEmailToken).toHaveBeenCalledWith('u1', 'reset', 30 * 60 * 1000)
    expect(sendEmail).not.toHaveBeenCalled()
    await runScheduled()
    expect(sendEmail.mock.calls[0][0].text).toContain(resetUrl('tok'))
  })

  it('answers the same for an unknown address, without a mail', async () => {
    findUserByEmail.mockResolvedValue(null)
    expect(await requestPasswordReset('nobody@example.test', '203.0.113.7', NOW)).toBe('sent')
    await runScheduled()
    expect(createEmailToken).not.toHaveBeenCalled()
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('sends nothing more over the per-address limit, and still answers "sent"', async () => {
    countRecentTokens.mockResolvedValue({ count: 3, latest: new Date(NOW.getTime() - 20 * 60_000) })
    expect(await requestPasswordReset('ada@example.test', null, NOW)).toBe('sent')
    expect(createEmailToken).not.toHaveBeenCalled()
  })

  it('answers "too-many" over the per-IP limit', async () => {
    consumeRateLimit.mockResolvedValue({ allowed: false, retryAfterMs: 1000 })
    expect(await requestPasswordReset('ada@example.test', '203.0.113.7', NOW)).toBe('too-many')
    expect(findUserByEmail).not.toHaveBeenCalled()
  })

  it('does not limit a private IP (the load balancer, shared by everyone)', async () => {
    await requestPasswordReset('ada@example.test', '10.2.0.5', NOW)
    expect(consumeRateLimit).not.toHaveBeenCalled()
  })
})

describe('resetPassword', () => {
  it('sets the password in one step (sessions closed, other links retired, change of address cancelled), mails the owner', async () => {
    consumeEmailToken.mockResolvedValue({ userId: 'u1' })
    expect(await resetPassword('tok', 'new-pass-1')).toEqual({ userId: 'u1' })
    expect(replacePassword).toHaveBeenCalledWith('u1', 'new-pass-1')
    await runScheduled()
    expect(sendEmail.mock.calls[0][0].subject).toBe('Your password was changed')
  })

  it('changes nothing with a used or expired link', async () => {
    consumeEmailToken.mockResolvedValue({ failure: 'used' })
    expect(await resetPassword('tok', 'new-pass-1')).toEqual({ failure: 'used' })
    expect(replacePassword).not.toHaveBeenCalled()
  })
})

describe('checkResetToken', () => {
  it('peeks without using the token', async () => {
    peekEmailToken.mockResolvedValue({ userId: 'u1' })
    expect(await checkResetToken('tok')).toBe('valid')
    expect(consumeEmailToken).not.toHaveBeenCalled()
  })

  it('refuses a missing token', async () => {
    expect(await checkResetToken(null)).toBe('invalid')
  })
})
