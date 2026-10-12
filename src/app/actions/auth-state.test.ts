// The auth actions send the submitted email back on failure, never the password,
// so the form can refill the email after React resets it (#68).
import { describe, it, expect, vi, beforeEach } from 'vitest'

const query = vi.fn()
const findUserByEmail = vi.fn()
const createUser = vi.fn()

vi.mock('@/lib/db', () => ({ pool: { query: (...args: unknown[]) => query(...args) } }))
vi.mock('@/lib/data/users', () => ({
  findUserByEmail: (...args: unknown[]) => findUserByEmail(...args),
  createUser: (...args: unknown[]) => createUser(...args),
}))
vi.mock('@/lib/auth/session', () => ({ createSession: vi.fn(), deleteSession: vi.fn() }))
vi.mock('@/lib/auth/email-verification', () => ({ sendVerificationEmail: vi.fn() }))
const verifyPassword = vi.fn<(...args: unknown[]) => Promise<boolean>>(async () => false)
vi.mock('@/lib/auth/password', () => ({ verifyPassword: (...a: unknown[]) => verifyPassword(...a), UNKNOWN_ACCOUNT_HASH: 'unknown' }))
const finish = vi.fn<(outcome: string) => Promise<void>>(async () => {})
vi.mock('@/lib/auth/login-limit', () => ({
  beginLoginAttempt: vi.fn(async () => ({ ok: true, finish: (o: string) => finish(o) })),
  purgeExpiredLoginRecords: vi.fn(async () => {}),
}))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('next/headers', () => ({ headers: async () => new Headers() }))
vi.mock('next/server', () => ({ after: vi.fn() }))
vi.mock('@/lib/auth/signup-limit', () => ({ checkSignup: vi.fn(async () => ({ ok: true })) }))

const { BusyError } = await import('@/lib/concurrency')
const { login, signup } = await import('./auth')

function form(fields: Record<string, string>): FormData {
  const data = new FormData()
  for (const [key, value] of Object.entries(fields)) data.set(key, value)
  return data
}

beforeEach(() => {
  query.mockReset().mockResolvedValue({ rows: [] })
  findUserByEmail.mockReset()
  createUser.mockReset()
})

describe('login', () => {
  it('returns the email, not the password, after a wrong password', async () => {
    findUserByEmail.mockResolvedValue({ id: 'u1', passwordHash: 'hash' })
    const state = await login(undefined, form({ email: 'ada@example.test', password: 'wrong-password' }))
    expect(state).toEqual({ message: 'Wrong email or password.', email: 'ada@example.test' })
    expect(JSON.stringify(state)).not.toContain('wrong-password')
  })

  it('checks a hash for an address with no account too, so the answer takes as long (#225)', async () => {
    findUserByEmail.mockResolvedValue(null)
    verifyPassword.mockClear()
    const state = await login(undefined, form({ email: 'nobody@example.test', password: 'whatever-password' }))
    expect(state).toEqual({ message: 'Wrong email or password.', email: 'nobody@example.test' })
    expect(verifyPassword).toHaveBeenCalledWith('whatever-password', 'unknown')
  })

  it('says so when so many checks wait that this one is refused, and cancels the attempt instead of counting it (#225)', async () => {
    findUserByEmail.mockResolvedValue({ id: 'u1', passwordHash: 'hash' })
    verifyPassword.mockRejectedValueOnce(new BusyError())
    finish.mockClear()
    const state = await login(undefined, form({ email: 'ada@example.test', password: 'some-password-1' }))
    expect(state).toEqual({ message: 'Sign-in is very busy right now. Try again in a moment.', email: 'ada@example.test' })
    expect(finish).toHaveBeenCalledWith('cancelled')
  })

  it('counts a wrong password as a failure and a right one as a success', async () => {
    findUserByEmail.mockResolvedValue({ id: 'u1', passwordHash: 'hash' })
    finish.mockClear()
    await login(undefined, form({ email: 'ada@example.test', password: 'wrong-password-1' }))
    expect(finish).toHaveBeenLastCalledWith('failure')
    verifyPassword.mockResolvedValueOnce(true)
    await login(undefined, form({ email: 'ada@example.test', password: 'right-password-1' }))
    expect(finish).toHaveBeenLastCalledWith('success')
  })

  it('returns the email after a validation error', async () => {
    const state = await login(undefined, form({ email: 'ada@example.test', password: '' }))
    expect(state?.email).toBe('ada@example.test')
    expect(state?.errors?.password).toEqual(['Enter your password.'])
  })
})

describe('signup', () => {
  it('says so when the hashing is too busy to take one more sign-up (#225)', async () => {
    createUser.mockRejectedValue(new BusyError())
    const state = await signup(undefined, form({ email: 'ada@example.test', password: 'abcd1234' }))
    expect(state).toEqual({ message: 'Sign-up is very busy right now. Try again in a moment.', email: 'ada@example.test' })
  })

  it('returns the email after a weak password', async () => {
    const state = await signup(undefined, form({ email: 'ada@example.test', password: 'short' }))
    expect(state?.email).toBe('ada@example.test')
    expect(JSON.stringify(state)).not.toContain('"short"')
  })

  it('returns the email when it is already registered', async () => {
    createUser.mockRejectedValue(Object.assign(new Error('duplicate'), { code: '23505' }))
    const state = await signup(undefined, form({ email: 'ada@example.test', password: 'abcd1234' }))
    expect(state).toEqual({ message: 'This email is already registered.', email: 'ada@example.test' })
  })
})
