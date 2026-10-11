import { describe, it, expect, vi, beforeEach } from 'vitest'

const getSessionUserId = vi.fn()
const deleteSession = vi.fn()
vi.mock('@/lib/auth/session', () => ({ getSessionUserId: () => getSessionUserId(), deleteSession: () => deleteSession() }))
const deleteAccount = vi.fn()
vi.mock('@/lib/data/account', () => ({ deleteAccount: (...a: unknown[]) => deleteAccount(...a) }))
const findUserById = vi.fn()
const findPasswordHash = vi.fn()
vi.mock('@/lib/data/users', () => ({ findUserById: (...a: unknown[]) => findUserById(...a), findPasswordHash: (...a: unknown[]) => findPasswordHash(...a) }))
const verifyPassword = vi.fn()
vi.mock('@/lib/auth/password', () => ({ verifyPassword: (...a: unknown[]) => verifyPassword(...a) }))
const noticeAccountDeleted = vi.fn()
vi.mock('@/lib/account-notice', () => ({ noticeAccountDeleted: (...a: unknown[]) => noticeAccountDeleted(...a) }))
const consumeRateLimit = vi.fn()
vi.mock('@/lib/rate-limit', () => ({ consumeRateLimit: (...a: unknown[]) => consumeRateLimit(...a) }))

const { DELETE } = await import('./route')

const good = { email: 'ada@example.test', password: 'secret' }
const send = (body: unknown) =>
  DELETE(new Request('http://x', { method: 'DELETE', body: typeof body === 'string' ? body : JSON.stringify(body), headers: { 'content-type': 'application/json' } }))

beforeEach(() => {
  getSessionUserId.mockReset().mockResolvedValue('u1')
  deleteSession.mockReset()
  noticeAccountDeleted.mockReset()
  deleteAccount.mockReset().mockResolvedValue(true)
  findUserById.mockReset().mockResolvedValue({ id: 'u1', email: 'ada@example.test' })
  findPasswordHash.mockReset().mockResolvedValue('hash')
  verifyPassword.mockReset().mockResolvedValue(true)
  consumeRateLimit.mockReset().mockResolvedValue({ allowed: true })
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('DELETE /api/account (#104)', () => {
  it('deletes the account when the email is typed again, and removes the cookie', async () => {
    const res = await send(good)
    expect(res.status).toBe(200)
    expect(deleteAccount).toHaveBeenCalledWith('u1')
    expect(deleteSession).toHaveBeenCalled()
  })

  it('tells the owner of the address that the account was deleted', async () => {
    await send(good)
    expect(noticeAccountDeleted).toHaveBeenCalledWith('ada@example.test')
  })

  it('does not mind the case or the spaces of what was typed', async () => {
    expect((await send({ ...good, email: '  Ada@Example.TEST ' })).status).toBe(200)
  })

  it('deletes nothing when the password is wrong: a session left open cannot delete the account', async () => {
    verifyPassword.mockResolvedValue(false)
    const res = await send(good)
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ code: 'wrong_password' })
    expect(deleteAccount).not.toHaveBeenCalled()
    expect(deleteSession).not.toHaveBeenCalled()
    expect(noticeAccountDeleted).not.toHaveBeenCalled()
  })

  it('checks the password against the hash of this account', async () => {
    await send(good)
    expect(findPasswordHash).toHaveBeenCalledWith('u1')
    expect(verifyPassword).toHaveBeenCalledWith('secret', 'hash')
  })

  it('deletes nothing when the email is not the account\'s', async () => {
    const res = await send({ ...good, email: 'someone@example.test' })
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ code: 'email_mismatch' })
    expect(deleteAccount).not.toHaveBeenCalled()
    expect(deleteSession).not.toHaveBeenCalled()
  })

  it('deletes nothing without a session, with no email, or with a body that is not JSON', async () => {
    expect((await send({})).status).toBe(400)
    expect((await send({ email: good.email })).status).toBe(400)
    expect((await send('nope')).status).toBe(400)
    getSessionUserId.mockResolvedValue(null)
    expect((await send(good)).status).toBe(401)
    expect(deleteAccount).not.toHaveBeenCalled()
  })

  it('stops guesses: refuses after too many attempts, before reading the account', async () => {
    consumeRateLimit.mockResolvedValue({ allowed: false })
    expect((await send(good)).status).toBe(429)
    expect(findUserById).not.toHaveBeenCalled()
    expect(deleteAccount).not.toHaveBeenCalled()
  })

  it('says so when the deletion fails, and keeps the cookie (the account may still exist)', async () => {
    deleteAccount.mockRejectedValue(new Error('db down'))
    const res = await send(good)
    expect(res.status).toBe(500)
    expect(deleteSession).not.toHaveBeenCalled()
  })
})
