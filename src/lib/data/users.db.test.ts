// The accounts against a real Postgres (#221): one account per address, a password that is never stored, a
// confirmation date that keeps the first value. The password is really hashed here (bcrypt, 12 rounds): few tests.
import { it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import type { Pool } from 'pg'
import { dbDescribe, getPool, resetData } from '@/tests/db/helpers'
import { verifyPassword } from '@/lib/auth/password'
import { createUser, findUserByEmail, findUserById, markEmailVerified, updatePassword } from './users'

let pool: Pool

dbDescribe('users on Postgres', () => {
  beforeAll(async () => {
    pool = await getPool()
  })
  beforeEach(async () => {
    await resetData(pool)
  })
  afterAll(async () => {
    await pool.end()
  })

  const stored = async (id: string) => (await pool.query('SELECT email, password_hash, email_verified_at FROM users WHERE id = $1', [id])).rows[0]

  it('stores a hash that checks against the password, never the password', async () => {
    const user = await createUser('ada@example.test', 'secret-password-1')
    const row = await stored(user.id)
    expect(row.password_hash).not.toContain('secret-password-1')
    expect(row.password_hash).toMatch(/^\$2[aby]\$12\$/)
    expect(await verifyPassword('secret-password-1', row.password_hash)).toBe(true)
    expect(await verifyPassword('another-password', row.password_hash)).toBe(false)
  })

  it('has one account per person: the same address in another case or with spaces is refused', async () => {
    await createUser('ada@example.test', 'secret-password-1')
    await expect(createUser('  ADA@Example.TEST ', 'secret-password-2')).rejects.toMatchObject({ code: '23505' })
  })

  it('stores the address in lower case, trimmed, and finds it however it is typed', async () => {
    const user = await createUser('  Grace@Example.TEST ', 'secret-password-1')
    expect((await stored(user.id)).email).toBe('grace@example.test')
    expect((await findUserByEmail('GRACE@example.test '))?.id).toBe(user.id)
    expect(await findUserByEmail('nobody@example.test')).toBeNull()
  })

  it('starts unconfirmed, and keeps the first confirmation date when it is confirmed twice', async () => {
    const user = await createUser('ada@example.test', 'secret-password-1')
    expect((await findUserById(user.id))?.emailVerified).toBe(false)
    await markEmailVerified(user.id)
    const first = (await stored(user.id)).email_verified_at
    expect(first).not.toBeNull()
    expect((await findUserById(user.id))?.emailVerified).toBe(true)
    await pool.query("UPDATE users SET email_verified_at = email_verified_at - interval '1 day' WHERE id = $1", [user.id])
    const earlier = (await stored(user.id)).email_verified_at
    await markEmailVerified(user.id)
    expect((await stored(user.id)).email_verified_at).toEqual(earlier)
  })

  it('changes the password: the new one checks, the old one does not', async () => {
    const user = await createUser('ada@example.test', 'secret-password-1')
    await updatePassword(user.id, 'new-password-2')
    const row = await stored(user.id)
    expect(await verifyPassword('new-password-2', row.password_hash)).toBe(true)
    expect(await verifyPassword('secret-password-1', row.password_hash)).toBe(false)
  })

  it('gives the hash to the login only: a lookup by id does not carry it', async () => {
    const user = await createUser('ada@example.test', 'secret-password-1')
    expect(await findUserByEmail('ada@example.test')).toHaveProperty('passwordHash')
    expect(await findUserById(user.id)).not.toHaveProperty('passwordHash')
  })
})
