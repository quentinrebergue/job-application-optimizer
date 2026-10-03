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
vi.mock('@/lib/auth/password', () => ({ verifyPassword: vi.fn(async () => false) }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))

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

  it('returns the email after a validation error', async () => {
    const state = await login(undefined, form({ email: 'ada@example.test', password: '' }))
    expect(state?.email).toBe('ada@example.test')
    expect(state?.errors?.password).toBeDefined()
  })
})

describe('signup', () => {
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
