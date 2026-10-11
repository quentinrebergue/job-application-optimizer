import { describe, it, expect, vi, beforeEach } from 'vitest'

const getSessionUserId = vi.fn()
vi.mock('@/lib/auth/session', () => ({ getSessionUserId: () => getSessionUserId() }))
const changePassword = vi.fn()
vi.mock('@/lib/auth/credentials', () => ({ changePassword: (...a: unknown[]) => changePassword(...a) }))

const { POST } = await import('./route')

const send = (body: unknown) =>
  POST(new Request('http://x', { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body), headers: { 'content-type': 'application/json' } }))

beforeEach(() => {
  getSessionUserId.mockReset().mockResolvedValue('u1')
  changePassword.mockReset().mockResolvedValue({ ok: true })
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('POST /api/account/password (#236)', () => {
  it('changes the password of the signed-in user', async () => {
    const res = await send({ currentPassword: 'old', newPassword: 'new-pass2' })
    expect(res.status).toBe(200)
    expect(changePassword).toHaveBeenCalledWith('u1', 'old', 'new-pass2')
  })

  it('passes on a refusal with its status and code', async () => {
    changePassword.mockResolvedValue({ ok: false, status: 400, code: 'wrong_password', message: 'Wrong password.' })
    const res = await send({ currentPassword: 'bad', newPassword: 'new-pass2' })
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Wrong password.', code: 'wrong_password' })
  })

  it('changes nothing without a session, with a field missing, or with a body that is not JSON', async () => {
    expect((await send({ currentPassword: 'old' })).status).toBe(400)
    expect((await send({ newPassword: 'x' })).status).toBe(400)
    expect((await send('nope')).status).toBe(400)
    getSessionUserId.mockResolvedValue(null)
    expect((await send({ currentPassword: 'old', newPassword: 'new-pass2' })).status).toBe(401)
    expect(changePassword).not.toHaveBeenCalled()
  })

  it('says so when it fails on our side', async () => {
    changePassword.mockRejectedValue(new Error('db down'))
    expect((await send({ currentPassword: 'old', newPassword: 'new-pass2' })).status).toBe(500)
  })
})
