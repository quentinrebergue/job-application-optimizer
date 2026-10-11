import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))
const consumeRateLimit = vi.fn()
vi.mock('@/lib/rate-limit', () => ({ consumeRateLimit: (...a: unknown[]) => consumeRateLimit(...a), deleteExpiredRateLimits: vi.fn(async () => 0) }))
vi.mock('next/server', () => ({ after: (task: () => unknown) => task() }))
const findPasswordHash = vi.fn()
const findUserById = vi.fn()
const replacePassword = vi.fn()
const updateEmail = vi.fn()
const emailTaken = vi.fn()
vi.mock('@/lib/data/users', () => ({
  findPasswordHash: (...a: unknown[]) => findPasswordHash(...a),
  findUserById: (...a: unknown[]) => findUserById(...a),
  replacePassword: (...a: unknown[]) => replacePassword(...a),
  updateEmail: (...a: unknown[]) => updateEmail(...a),
  emailTaken: (...a: unknown[]) => emailTaken(...a),
}))
const consumeEmailChangeToken = vi.fn()
const createEmailToken = vi.fn()
const invalidateEmailTokens = vi.fn()
vi.mock('@/lib/data/email-tokens', () => ({
  consumeEmailChangeToken: (...a: unknown[]) => consumeEmailChangeToken(...a),
  createEmailToken: (...a: unknown[]) => createEmailToken(...a),
  deleteExpiredEmailTokens: vi.fn(async () => 0),
  invalidateEmailTokens: (...a: unknown[]) => invalidateEmailTokens(...a),
}))
const verifyPassword = vi.fn()
vi.mock('@/lib/auth/password', () => ({ verifyPassword: (...a: unknown[]) => verifyPassword(...a) }))
const calls: string[] = []
const createSession = vi.fn(async () => void calls.push('createSession'))
vi.mock('@/lib/auth/session', () => ({ createSession: () => createSession() }))
vi.mock('@/lib/email/providers', () => ({ appUrl: () => 'https://fastresume.tech' }))
const noticePasswordChanged = vi.fn()
const noticeEmailChangeRequested = vi.fn()
const noticeEmailChanged = vi.fn()
const noticeChangeEmailLink = vi.fn()
const noticeEmailAlreadyUsed = vi.fn()
vi.mock('@/lib/account-notice', () => ({
  noticePasswordChanged: (...a: unknown[]) => noticePasswordChanged(...a),
  noticeEmailChangeRequested: (...a: unknown[]) => noticeEmailChangeRequested(...a),
  noticeEmailChanged: (...a: unknown[]) => noticeEmailChanged(...a),
  noticeChangeEmailLink: (...a: unknown[]) => noticeChangeEmailLink(...a),
  noticeEmailAlreadyUsed: (...a: unknown[]) => noticeEmailAlreadyUsed(...a),
}))

const { changePassword, requestEmailChange, confirmEmailChange } = await import('./credentials')

const USER = { id: 'u1', email: 'ada@example.test' }

beforeEach(() => {
  calls.length = 0
  for (const fn of [consumeRateLimit, findPasswordHash, findUserById, replacePassword, updateEmail, emailTaken, consumeEmailChangeToken,
    createEmailToken, invalidateEmailTokens, verifyPassword, noticePasswordChanged, noticeEmailChangeRequested, noticeEmailChanged,
    noticeChangeEmailLink, noticeEmailAlreadyUsed]) fn.mockReset()
  createSession.mockClear()
  delete process.env.EMAIL_CHANGES_MAX_PER_DAY
  consumeRateLimit.mockResolvedValue({ allowed: true })
  findPasswordHash.mockResolvedValue('hash')
  verifyPassword.mockResolvedValue(true)
  findUserById.mockResolvedValue(USER)
  emailTaken.mockResolvedValue(false)
  updateEmail.mockResolvedValue(true)
  createEmailToken.mockResolvedValue('tok')
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('changePassword (#236)', () => {
  it('sets the password in one step (sessions and pending links go with it), opens this device again, tells the owner', async () => {
    replacePassword.mockImplementation(async () => void calls.push('replacePassword'))
    expect(await changePassword('u1', 'old-pass1', 'new-pass2')).toEqual({ ok: true })
    expect(replacePassword).toHaveBeenCalledWith('u1', 'new-pass2')
    // The order matters: this device is let in last, after every session was closed.
    expect(calls).toEqual(['replacePassword', 'createSession'])
    expect(noticePasswordChanged).toHaveBeenCalledWith('ada@example.test')
  })

  it('changes nothing when the current password is wrong', async () => {
    verifyPassword.mockResolvedValue(false)
    expect(await changePassword('u1', 'bad', 'new-pass2')).toMatchObject({ ok: false, code: 'wrong_password', status: 400 })
    expect(replacePassword).not.toHaveBeenCalled()
  })

  it('refuses a new password that breaks the rules of the sign-up, and one that is the same', async () => {
    expect(await changePassword('u1', 'old-pass1', 'short1')).toMatchObject({ ok: false, code: 'weak_password', message: 'At least 8 characters.' })
    expect(await changePassword('u1', 'old-pass1', 'onlyletters')).toMatchObject({ ok: false, code: 'weak_password', message: 'At least one digit.' })
    expect(await changePassword('u1', 'same-pass1', 'same-pass1')).toMatchObject({ ok: false, code: 'same_password' })
    expect(replacePassword).not.toHaveBeenCalled()
  })

  it('stops guesses: refuses before looking at the password once the attempts are used', async () => {
    consumeRateLimit.mockResolvedValue({ allowed: false })
    expect(await changePassword('u1', 'old-pass1', 'new-pass2')).toMatchObject({ ok: false, status: 429 })
    expect(verifyPassword).not.toHaveBeenCalled()
  })
})

describe('requestEmailChange (#236)', () => {
  it('sends the NEW address a link, tells the current one, and changes nothing yet', async () => {
    const result = await requestEmailChange('u1', 'pw', '  New@Example.test ')
    expect(result).toEqual({ ok: true, email: 'new@example.test' })
    expect(createEmailToken).toHaveBeenCalledWith('u1', 'change-email', 24 * 3_600_000, 'new@example.test')
    expect(noticeChangeEmailLink).toHaveBeenCalledWith('new@example.test', 'https://fastresume.tech/verify-email/change?token=tok')
    expect(noticeEmailChangeRequested).toHaveBeenCalledWith('ada@example.test', 'new@example.test')
    expect(noticeEmailAlreadyUsed).not.toHaveBeenCalled()
    expect(updateEmail).not.toHaveBeenCalled()
  })

  it('makes an earlier link useless: one link at a time', async () => {
    await requestEmailChange('u1', 'pw', 'new@example.test')
    expect(invalidateEmailTokens).toHaveBeenCalledWith('u1', 'change-email')
  })

  it('answers the same for an address that already has an account, and tells that address instead of giving a link', async () => {
    emailTaken.mockResolvedValue(true)
    const free = await requestEmailChange('u1', 'pw', 'free@example.test')
    const taken = await requestEmailChange('u1', 'pw', 'taken@example.test')
    // Nothing in the answer says which one was taken.
    expect({ ...taken, email: undefined }).toEqual({ ...free, email: undefined })
    expect(taken).toEqual({ ok: true, email: 'taken@example.test' })
    expect(noticeEmailAlreadyUsed).toHaveBeenCalledWith('taken@example.test')
    expect(createEmailToken).not.toHaveBeenCalled()
    expect(noticeChangeEmailLink).not.toHaveBeenCalled()
  })

  it('does not even tell the owner of the current address apart: they are told for a taken address too', async () => {
    emailTaken.mockResolvedValue(true)
    await requestEmailChange('u1', 'pw', 'taken@example.test')
    expect(noticeEmailChangeRequested).toHaveBeenCalledWith('ada@example.test', 'taken@example.test')
  })

  it('sends nothing when the password is wrong, the address is not valid, or is the current one', async () => {
    verifyPassword.mockResolvedValueOnce(false)
    expect(await requestEmailChange('u1', 'bad', 'new@example.test')).toMatchObject({ code: 'wrong_password' })
    expect(await requestEmailChange('u1', 'pw', 'not an email')).toMatchObject({ code: 'invalid_email' })
    expect(await requestEmailChange('u1', 'pw', 'ADA@example.test')).toMatchObject({ code: 'same_email' })
    expect(noticeChangeEmailLink).not.toHaveBeenCalled()
    expect(createEmailToken).not.toHaveBeenCalled()
  })

  it('stops guesses: refuses before looking at the password once the attempts are used', async () => {
    consumeRateLimit.mockResolvedValue({ allowed: false })
    expect(await requestEmailChange('u1', 'pw', 'new@example.test')).toMatchObject({ ok: false, status: 429 })
    expect(verifyPassword).not.toHaveBeenCalled()
  })

  it('caps the requests of a user at 10 a day, and of the whole site at 100, each sending a mail to a stranger', async () => {
    consumeRateLimit.mockImplementation(async (key: string) => ({ allowed: key !== 'account-email-day:u1' }))
    expect(await requestEmailChange('u1', 'pw', 'new@example.test')).toMatchObject({ ok: false, status: 429, code: 'rate_limited' })
    consumeRateLimit.mockImplementation(async (key: string) => ({ allowed: key !== 'account-email-all:day' }))
    expect(await requestEmailChange('u1', 'pw', 'new@example.test')).toMatchObject({ ok: false, status: 503, code: 'busy' })
    expect(noticeChangeEmailLink).not.toHaveBeenCalled()
    expect(consumeRateLimit).toHaveBeenCalledWith('account-email-day:u1', 10, 86_400_000)
    expect(consumeRateLimit).toHaveBeenCalledWith('account-email-all:day', 100, 86_400_000)
  })

  it('does not use up the daily caps on a wrong password: a stranger cannot burn the site cap by guessing', async () => {
    verifyPassword.mockResolvedValue(false)
    await requestEmailChange('u1', 'bad', 'new@example.test')
    expect(consumeRateLimit.mock.calls.map((c) => c[0])).toEqual(['account-email:u1'])
  })

  it('reads the cap of the site from the environment', async () => {
    process.env.EMAIL_CHANGES_MAX_PER_DAY = '30'
    await requestEmailChange('u1', 'pw', 'new@example.test')
    expect(consumeRateLimit).toHaveBeenCalledWith('account-email-all:day', 30, 86_400_000)
  })
})

describe('confirmEmailChange (#236)', () => {
  it('gives the account the address of the link, and tells the old address', async () => {
    consumeEmailChangeToken.mockResolvedValue({ userId: 'u1', newEmail: 'new@example.test' })
    expect(await confirmEmailChange('tok')).toBe('changed')
    expect(updateEmail).toHaveBeenCalledWith('u1', 'new@example.test')
    expect(noticeEmailChanged).toHaveBeenCalledWith('ada@example.test', 'new@example.test')
  })

  it('passes on why a link is refused, and changes nothing', async () => {
    consumeEmailChangeToken.mockResolvedValue({ failure: 'expired' })
    expect(await confirmEmailChange('tok')).toBe('expired')
    expect(await confirmEmailChange(null)).toBe('invalid')
    expect(updateEmail).not.toHaveBeenCalled()
  })

  it('says taken when another account got the address meanwhile, and tells no one', async () => {
    consumeEmailChangeToken.mockResolvedValue({ userId: 'u1', newEmail: 'new@example.test' })
    updateEmail.mockResolvedValue(false)
    expect(await confirmEmailChange('tok')).toBe('taken')
    expect(noticeEmailChanged).not.toHaveBeenCalled()
  })
})
