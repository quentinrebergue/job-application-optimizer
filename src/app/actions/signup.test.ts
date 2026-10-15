import { describe, it, expect, vi, beforeEach } from 'vitest'

const createUser = vi.fn()
const createSession = vi.fn()
const sendVerificationEmail = vi.fn()
const checkSignup = vi.fn()
const giveBack = vi.fn()
const redirect = vi.fn((path: string) => { throw new Error(`REDIRECT ${path}`) })

vi.mock('@/lib/db', () => ({ pool: { query: vi.fn() } }))
vi.mock('next/navigation', () => ({ redirect: (p: string) => redirect(p) }))
vi.mock('next/server', () => ({ after: (fn: () => unknown) => fn() }))
vi.mock('next/headers', () => ({ headers: async () => new Headers({ 'x-real-ip': '203.0.113.7' }) }))
vi.mock('@/lib/data/users', () => ({ createUser: (...a: unknown[]) => createUser(...a), findUserByEmail: vi.fn() }))
vi.mock('@/lib/auth/session', () => ({ createSession: (...a: unknown[]) => createSession(...a), deleteSession: vi.fn() }))
vi.mock('@/lib/auth/email-verification', () => ({ sendVerificationEmail: (...a: unknown[]) => sendVerificationEmail(...a) }))
vi.mock('@/lib/auth/signup-limit', () => ({ checkSignup: (...a: unknown[]) => checkSignup(...a) }))
vi.mock('@/lib/rate-limit', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/rate-limit')>()),
  deleteExpiredRateLimits: vi.fn().mockResolvedValue(0),
}))

const { signup } = await import('./auth')

const form = (email: string, password: string) => {
  const f = new FormData()
  f.set('email', email)
  f.set('password', password)
  return f
}

beforeEach(() => {
  createUser.mockReset().mockResolvedValue({ id: 'u1', email: 'a@example.com' })
  createSession.mockReset().mockResolvedValue(undefined)
  sendVerificationEmail.mockReset().mockResolvedValue(undefined)
  giveBack.mockReset().mockResolvedValue(undefined)
  checkSignup.mockReset().mockResolvedValue({ ok: true, giveBack })
  redirect.mockClear()
})

describe('signup and its limit (#210)', () => {
  it('checks the limit with the visitor\'s address, then creates the account', async () => {
    await expect(signup(undefined, form('a@example.com', 'abcd1234'))).rejects.toThrow('REDIRECT')
    expect(checkSignup).toHaveBeenCalledWith('203.0.113.7')
    expect(checkSignup.mock.invocationCallOrder[0]).toBeLessThan(createUser.mock.invocationCallOrder[0])
    expect(createUser).toHaveBeenCalledWith('a@example.com', 'abcd1234')
  })

  it('creates nothing, sends no mail and starts no session when the limit is reached', async () => {
    checkSignup.mockResolvedValue({ ok: false, message: 'Too many sign-ups from your network. Try again in 12 minutes.' })
    const state = await signup(undefined, form('a@example.com', 'abcd1234'))
    expect(state).toEqual({ message: 'Too many sign-ups from your network. Try again in 12 minutes.', email: 'a@example.com' })
    expect(createUser).not.toHaveBeenCalled()
    expect(createSession).not.toHaveBeenCalled()
    expect(sendVerificationEmail).not.toHaveBeenCalled()
  })

  it('gives the points back when the sign-up is refused for lack of room, and makes no account', async () => {
    const { BusyError } = await import('@/lib/concurrency')
    createUser.mockRejectedValue(new BusyError())
    const state = await signup(undefined, form('a@example.com', 'abcd1234'))
    expect(state?.message).toMatch(/very busy/)
    expect(giveBack).toHaveBeenCalledTimes(1)
    expect(createSession).not.toHaveBeenCalled()
  })

  it('keeps the points of a sign-up that failed for another reason (a duplicate address)', async () => {
    createUser.mockRejectedValue(Object.assign(new Error('duplicate'), { code: '23505' }))
    await signup(undefined, form('a@example.com', 'abcd1234'))
    expect(giveBack).not.toHaveBeenCalled()
  })

  it('does not count a form that is not valid', async () => {
    const state = await signup(undefined, form('not-an-email', 'abcd1234'))
    expect(state?.errors?.email).toBeDefined()
    expect(checkSignup).not.toHaveBeenCalled()
  })
})
