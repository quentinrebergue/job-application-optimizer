// The accounts against a real Postgres (#221): one account per address, a password that is never stored, a
// confirmation date that keeps the first value. The password is really hashed here (bcrypt, 12 rounds): few tests.
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import type { Pool } from 'pg'
import { dbDescribe, getPool, makeUser, resetData } from '@/tests/db/helpers'
import { verifyPassword } from '@/lib/auth/password'
import { consumeEmailChangeToken, consumeEmailToken, createEmailToken } from './email-tokens'
import { createUser, emailTaken, findUserByEmail, findUserById, markEmailVerified, replacePassword, updateEmail, updatePassword } from './users'

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

  describe('change of address (#236)', () => {
    it('gives the account the new address, in lower case, already confirmed', async () => {
      const id = await makeUser(pool, 'old@example.test')
      expect(await updateEmail(id, '  New@Example.test ')).toBe(true)
      const row = await stored(id)
      expect(row.email).toBe('new@example.test')
      expect(row.email_verified_at).not.toBeNull()
    })

    it('refuses an address that another account has, and keeps the old one: the unique index decides', async () => {
      const id = await makeUser(pool, 'old@example.test')
      await makeUser(pool, 'taken@example.test')
      expect(await updateEmail(id, 'Taken@example.test')).toBe(false)
      expect((await stored(id)).email).toBe('old@example.test')
    })

    it('says whether an address is taken, whatever its capitals', async () => {
      await makeUser(pool, 'taken@example.test')
      expect(await emailTaken('TAKEN@example.test ')).toBe(true)
      expect(await emailTaken('free@example.test')).toBe(false)
    })

    it('lets the login find the account by its new address and no longer by the old one', async () => {
      const id = await makeUser(pool, 'old@example.test')
      await updateEmail(id, 'new@example.test')
      expect((await findUserByEmail('new@example.test'))?.id).toBe(id)
      expect(await findUserByEmail('old@example.test')).toBeNull()
    })
  })

  describe('replacePassword: the password changes and what could outlive it goes in the same step (#236)', () => {
    const session = (id: string, user: string) =>
      pool.query(`INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, now() + interval '1 day')`, [id, user])

    it('sets a password that checks, and closes every session of the user and only theirs', async () => {
      const id = await makeUser(pool, 'ada@example.test')
      const other = await makeUser(pool, 'bob@example.test')
      await session('s-ada-1', id)
      await session('s-ada-2', id)
      await session('s-bob', other)
      await replacePassword(id, 'new-password-1')
      expect(await verifyPassword('new-password-1', (await stored(id)).password_hash)).toBe(true)
      const { rows } = await pool.query('SELECT id FROM sessions ORDER BY id')
      expect(rows).toEqual([{ id: 's-bob' }])
    })

    it('cancels a pending change of address: the link an attacker asked for dies with the password it was asked under', async () => {
      const id = await makeUser(pool, 'ada@example.test')
      const link = await createEmailToken(id, 'change-email', 3_600_000, 'attacker@example.test')
      await replacePassword(id, 'new-password-1')
      expect(await consumeEmailChangeToken(link)).toEqual({ failure: 'used' })
    })

    it('cancels the reset links not yet used, and leaves the confirmation link and other users alone', async () => {
      const id = await makeUser(pool, 'ada@example.test')
      const other = await makeUser(pool, 'bob@example.test')
      const reset = await createEmailToken(id, 'reset', 3_600_000)
      const verify = await createEmailToken(id, 'verify', 3_600_000)
      const othersChange = await createEmailToken(other, 'change-email', 3_600_000, 'new@example.test')
      await replacePassword(id, 'new-password-1')
      expect(await consumeEmailToken(reset, 'reset')).toEqual({ failure: 'used' })
      expect(await consumeEmailToken(verify, 'verify')).toEqual({ userId: id })
      expect(await consumeEmailChangeToken(othersChange)).toEqual({ userId: other, newEmail: 'new@example.test' })
    })

    it('changes nothing at all when it fails: no new password without the sessions closed', async () => {
      const id = await makeUser(pool, 'ada@example.test')
      await session('s-ada', id)
      const before = (await stored(id)).password_hash
      // A password that cannot be hashed fails before the transaction; one the database refuses fails inside it.
      await pool.query(`CREATE OR REPLACE FUNCTION refuse_session_delete() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'refused'; END; $$ LANGUAGE plpgsql`)
      await pool.query('CREATE TRIGGER no_delete BEFORE DELETE ON sessions FOR EACH ROW EXECUTE FUNCTION refuse_session_delete()')
      try {
        await expect(replacePassword(id, 'new-password-1')).rejects.toThrow('refused')
        expect((await stored(id)).password_hash).toBe(before)
        expect((await pool.query('SELECT 1 FROM sessions')).rows).toHaveLength(1)
      } finally {
        await pool.query('DROP TRIGGER no_delete ON sessions')
        await pool.query('DROP FUNCTION refuse_session_delete()')
      }
    })
  })
})
