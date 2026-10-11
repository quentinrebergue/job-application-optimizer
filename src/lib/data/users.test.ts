import { describe, it, expect, vi, beforeEach } from 'vitest'

const query = vi.fn()
vi.mock('@/lib/db', () => ({ pool: { query: (...a: unknown[]) => query(...a) } }))
vi.mock('@/lib/auth/password', () => ({ hashPassword: async (p: string) => `hashed(${p})` }))

const { createUser, findUserByEmail, findUserById, markEmailVerified, updatePassword } = await import('./users')

const ROW = {
  id: 'u1',
  email: 'ada@example.test',
  password_hash: 'hashed(secret-password)',
  created_at: new Date('2026-10-03T10:00:00Z'),
  email_verified_at: null as Date | null,
}

beforeEach(() => query.mockReset().mockResolvedValue({ rows: [ROW] }))

describe('createUser', () => {
  it('keeps the address in lower case and trimmed, so one person has one account', async () => {
    await createUser('  Ada@Example.TEST ', 'secret-password')
    expect(query.mock.calls[0][1][0]).toBe('ada@example.test')
  })

  it('stores the hash of the password, never the password', async () => {
    await createUser('ada@example.test', 'secret-password')
    const params = query.mock.calls[0][1] as string[]
    expect(params[1]).toBe('hashed(secret-password)')
    expect(params).not.toContain('secret-password')
  })

  it('returns the user without any trace of the hash', async () => {
    const user = await createUser('ada@example.test', 'secret-password')
    expect(user).toEqual({ id: 'u1', email: 'ada@example.test', createdAt: '2026-10-03T10:00:00.000Z', emailVerified: false })
    expect(JSON.stringify(user)).not.toContain('hashed')
  })
})

describe('findUserById', () => {
  it('gives what a page may show, never the hash', async () => {
    const user = await findUserById('u1')
    expect(user).not.toHaveProperty('passwordHash')
    expect(user).not.toHaveProperty('password_hash')
    expect(JSON.stringify(user)).not.toContain('hashed')
  })

  it('is null for an id nobody has', async () => {
    query.mockResolvedValue({ rows: [] })
    expect(await findUserById('nope')).toBeNull()
  })

  it('says the address is confirmed once there is a confirmation date', async () => {
    query.mockResolvedValue({ rows: [{ ...ROW, email_verified_at: new Date('2026-10-04T00:00:00Z') }] })
    expect((await findUserById('u1'))?.emailVerified).toBe(true)
  })
})

describe('findUserByEmail', () => {
  it('finds an address whatever its case or its spaces', async () => {
    await findUserByEmail(' ADA@example.test ')
    expect(query.mock.calls[0][1]).toEqual(['ada@example.test'])
  })

  it('gives the hash, for the login to check, and only here', async () => {
    const user = await findUserByEmail('ada@example.test')
    expect(user?.passwordHash).toBe('hashed(secret-password)')
  })

  it('is null for an address nobody has', async () => {
    query.mockResolvedValue({ rows: [] })
    expect(await findUserByEmail('nobody@example.test')).toBeNull()
  })
})

describe('markEmailVerified', () => {
  it('keeps the first confirmation date: confirming twice changes nothing', async () => {
    await markEmailVerified('u1')
    expect(query.mock.calls[0][0]).toContain('email_verified_at IS NULL')
    expect(query.mock.calls[0][1]).toEqual(['u1'])
  })
})

describe('updatePassword', () => {
  it('stores a hash, for this user only', async () => {
    await updatePassword('u1', 'new-password')
    expect(query.mock.calls[0][1]).toEqual(['u1', 'hashed(new-password)'])
    expect(query.mock.calls[0][0]).toContain('WHERE id = $1')
  })
})
