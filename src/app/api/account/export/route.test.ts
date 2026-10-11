import { describe, it, expect, vi, beforeEach } from 'vitest'

const getSessionUserId = vi.fn()
vi.mock('@/lib/auth/session', () => ({ getSessionUserId: () => getSessionUserId() }))
const exportAccount = vi.fn()
vi.mock('@/lib/data/account', () => ({ exportAccount: (...a: unknown[]) => exportAccount(...a) }))
const findUserById = vi.fn()
const findPasswordHash = vi.fn()
vi.mock('@/lib/data/users', () => ({ findUserById: (...a: unknown[]) => findUserById(...a), findPasswordHash: (...a: unknown[]) => findPasswordHash(...a) }))
const verifyPassword = vi.fn()
vi.mock('@/lib/auth/password', () => ({ verifyPassword: (...a: unknown[]) => verifyPassword(...a) }))
const noticeDataExported = vi.fn()
vi.mock('@/lib/account-notice', () => ({ noticeDataExported: (...a: unknown[]) => noticeDataExported(...a) }))
const consumeRateLimit = vi.fn()
vi.mock('@/lib/rate-limit', () => ({ consumeRateLimit: (...a: unknown[]) => consumeRateLimit(...a) }))

const { POST } = await import('./route')

const send = (body: unknown = { password: 'secret' }) =>
  POST(new Request('http://x', { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body), headers: { 'content-type': 'application/json' } }))

beforeEach(() => {
  getSessionUserId.mockReset().mockResolvedValue('u1')
  exportAccount.mockReset().mockResolvedValue({ exported_at: '2026-10-11T20:00:00.000Z', account: { email: 'a@example.test' }, jobs: [] })
  findUserById.mockReset().mockResolvedValue({ id: 'u1', email: 'a@example.test' })
  findPasswordHash.mockReset().mockResolvedValue('hash')
  verifyPassword.mockReset().mockResolvedValue(true)
  noticeDataExported.mockReset()
  consumeRateLimit.mockReset().mockResolvedValue({ allowed: true })
})

describe('POST /api/account/export (#104)', () => {
  it('gives the data of the signed-in user as a file to save, never kept by a cache', async () => {
    const res = await send()
    expect(res.status).toBe(200)
    expect(res.headers.get('content-disposition')).toBe('attachment; filename="fastresume-export-2026-10-11.json"')
    expect(res.headers.get('cache-control')).toBe('no-store')
    expect(JSON.parse(await res.text())).toMatchObject({ account: { email: 'a@example.test' } })
    expect(exportAccount).toHaveBeenCalledWith('u1')
  })

  it('tells the owner of the address that a copy was downloaded', async () => {
    await send()
    expect(noticeDataExported).toHaveBeenCalledWith('u1', 'a@example.test')
  })

  it('gives nothing when the password is wrong, and tells no one: nothing was downloaded', async () => {
    verifyPassword.mockResolvedValue(false)
    const res = await send()
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ code: 'wrong_password' })
    expect(exportAccount).not.toHaveBeenCalled()
    expect(noticeDataExported).not.toHaveBeenCalled()
  })

  it('checks the password against the hash of this account', async () => {
    await send()
    expect(findPasswordHash).toHaveBeenCalledWith('u1')
    expect(verifyPassword).toHaveBeenCalledWith('secret', 'hash')
  })

  it('gives nothing without a session, without a password, or with a body that is not JSON', async () => {
    expect((await send({})).status).toBe(400)
    expect((await send('nope')).status).toBe(400)
    getSessionUserId.mockResolvedValue(null)
    expect((await send()).status).toBe(401)
    expect(exportAccount).not.toHaveBeenCalled()
  })

  it('stops guesses: refuses after too many attempts, before checking the password', async () => {
    consumeRateLimit.mockResolvedValue({ allowed: false })
    expect((await send()).status).toBe(429)
    expect(verifyPassword).not.toHaveBeenCalled()
    expect(exportAccount).not.toHaveBeenCalled()
  })
})
