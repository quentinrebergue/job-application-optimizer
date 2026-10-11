import { describe, it, expect, vi, beforeEach } from 'vitest'

const getSessionUserId = vi.fn()
vi.mock('@/lib/auth/session', () => ({ getSessionUserId: () => getSessionUserId() }))
const requestEmailChange = vi.fn()
vi.mock('@/lib/auth/credentials', () => ({ requestEmailChange: (...a: unknown[]) => requestEmailChange(...a) }))

const { POST } = await import('./route')

const send = (body: unknown) =>
  POST(new Request('http://x', { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body), headers: { 'content-type': 'application/json' } }))

beforeEach(() => {
  getSessionUserId.mockReset().mockResolvedValue('u1')
  requestEmailChange.mockReset().mockResolvedValue({ ok: true, email: 'new@example.test' })
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('POST /api/account/email (#236)', () => {
  it('asks the change for the signed-in user and says where the link went', async () => {
    const res = await send({ email: 'new@example.test', password: 'pw' })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ sent: true, email: 'new@example.test' })
    expect(requestEmailChange).toHaveBeenCalledWith('u1', 'pw', 'new@example.test')
  })

  it('passes on a refusal with its status and code', async () => {
    requestEmailChange.mockResolvedValue({ ok: false, status: 409, code: 'email_taken', message: 'An account already uses this address.' })
    const res = await send({ email: 'taken@example.test', password: 'pw' })
    expect(res.status).toBe(409)
    expect(await res.json()).toMatchObject({ code: 'email_taken' })
  })

  it('asks nothing without a session, with a field missing, or with a body that is not JSON', async () => {
    expect((await send({ email: 'new@example.test' })).status).toBe(400)
    expect((await send('nope')).status).toBe(400)
    getSessionUserId.mockResolvedValue(null)
    expect((await send({ email: 'new@example.test', password: 'pw' })).status).toBe(401)
    expect(requestEmailChange).not.toHaveBeenCalled()
  })
})
