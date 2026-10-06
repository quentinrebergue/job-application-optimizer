import { describe, it, expect, vi, beforeEach } from 'vitest'

const findUserById = vi.fn()
const markEmailVerified = vi.fn()
const countRecentTokens = vi.fn()
const createEmailToken = vi.fn()
const consumeEmailToken = vi.fn()
const sendEmail = vi.fn()

vi.mock('server-only', () => ({}))
vi.mock('@/lib/data/users', () => ({
  findUserById: (...a: unknown[]) => findUserById(...a),
  markEmailVerified: (...a: unknown[]) => markEmailVerified(...a),
}))
vi.mock('@/lib/data/email-tokens', () => ({
  countRecentTokens: (...a: unknown[]) => countRecentTokens(...a),
  createEmailToken: (...a: unknown[]) => createEmailToken(...a),
  consumeEmailToken: (...a: unknown[]) => consumeEmailToken(...a),
}))
vi.mock('@/lib/email/send', () => ({ sendEmail: (...a: unknown[]) => sendEmail(...a) }))

const { resendVerificationEmail, confirmEmail, confirmUrl } = await import('./email-verification')

const NOW = new Date('2026-10-06T12:00:00Z')
const USER = { id: 'u1', email: 'ada@example.test', emailVerified: false }

beforeEach(() => {
  for (const fn of [findUserById, markEmailVerified, countRecentTokens, createEmailToken, consumeEmailToken, sendEmail]) fn.mockReset()
  findUserById.mockResolvedValue(USER)
  countRecentTokens.mockResolvedValue({ count: 0, latest: null })
  createEmailToken.mockResolvedValue('tok')
  sendEmail.mockResolvedValue(undefined)
})

describe('resendVerificationEmail', () => {
  it('sends a new link', async () => {
    expect(await resendVerificationEmail('u1', NOW)).toEqual({ ok: true })
    expect(sendEmail).toHaveBeenCalledTimes(1)
    expect(sendEmail.mock.calls[0][0].text).toContain(confirmUrl('tok'))
  })

  it('refuses when the email is already confirmed', async () => {
    findUserById.mockResolvedValue({ ...USER, emailVerified: true })
    expect(await resendVerificationEmail('u1', NOW)).toMatchObject({ ok: false })
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('waits a minute between two mails', async () => {
    countRecentTokens.mockResolvedValue({ count: 1, latest: new Date(NOW.getTime() - 30_000) })
    expect(await resendVerificationEmail('u1', NOW)).toMatchObject({ ok: false, message: expect.stringContaining('minute') })
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('allows five mails an hour', async () => {
    countRecentTokens.mockResolvedValue({ count: 5, latest: new Date(NOW.getTime() - 10 * 60_000) })
    expect(await resendVerificationEmail('u1', NOW)).toMatchObject({ ok: false, message: expect.stringContaining('hour') })
  })

  it('reports a mail that could not be sent', async () => {
    sendEmail.mockRejectedValue(new Error('down'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(await resendVerificationEmail('u1', NOW)).toMatchObject({ ok: false })
  })
})

describe('confirmEmail', () => {
  it('confirms the user of a valid link', async () => {
    consumeEmailToken.mockResolvedValue({ userId: 'u1' })
    expect(await confirmEmail('tok')).toBe('confirmed')
    expect(markEmailVerified).toHaveBeenCalledWith('u1')
  })

  it('passes on why a link is refused', async () => {
    consumeEmailToken.mockResolvedValue({ failure: 'expired' })
    expect(await confirmEmail('tok')).toBe('expired')
    expect(markEmailVerified).not.toHaveBeenCalled()
  })

  it('refuses a missing token', async () => {
    expect(await confirmEmail(null)).toBe('invalid')
  })
})
