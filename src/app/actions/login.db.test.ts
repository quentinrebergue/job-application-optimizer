// The limit on failed logins against a real Postgres (#221): 5 failures in 15 minutes per address, counted in
// login_attempts. The hashing is replaced by a fast stand-in (bcrypt at 12 rounds takes a quarter of a second a
// try, and what is tested here is the counting, not bcrypt: that is checked in users.db.test.ts).
import { it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest'
import type { Pool } from 'pg'
import { dbDescribe, getPool, resetData } from '@/tests/db/helpers'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/auth/password', () => ({
  hashPassword: async (plain: string) => `fast-hash:${plain}`,
  verifyPassword: async (plain: string, hash: string) => hash === `fast-hash:${plain}`,
}))
const jar = new Map<string, string>()
vi.mock('next/headers', () => ({
  headers: async () => new Headers(),
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { value: jar.get(name) } : undefined),
    set: (name: string, value: string) => void jar.set(name, value),
    delete: (name: string) => void jar.delete(name),
  }),
}))
vi.mock('next/navigation', () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT ${path}`)
  },
}))
vi.mock('next/server', () => ({ after: (fn: () => unknown) => fn() }))

import { createUser } from '@/lib/data/users'
import { login } from './auth'

let pool: Pool

const form = (email: string, password: string) => {
  const f = new FormData()
  f.set('email', email)
  f.set('password', password)
  return f
}
const attempts = async (email: string) => (await pool.query('SELECT count FROM login_attempts WHERE email = $1', [email])).rows[0]?.count

dbDescribe('failed logins on Postgres', () => {
  beforeAll(async () => {
    pool = await getPool()
  })
  beforeEach(async () => {
    await resetData(pool)
    jar.clear()
    await createUser('ada@example.test', 'right-password-1')
  })
  afterAll(async () => {
    await pool.end()
  })

  it('counts each wrong password and answers the same message', async () => {
    for (let i = 1; i <= 3; i++) {
      expect(await login(undefined, form('ada@example.test', 'wrong-password-1'))).toMatchObject({ message: 'Wrong email or password.' })
      expect(await attempts('ada@example.test')).toBe(i)
    }
  })

  it('stops at the 6th try, and refuses even the right password while the limit lasts', async () => {
    for (let i = 0; i < 5; i++) await login(undefined, form('ada@example.test', 'wrong-password-1'))
    const sixth = await login(undefined, form('ada@example.test', 'right-password-1'))
    expect(sixth).toMatchObject({ message: 'Too many attempts. Try again in 15 minutes.' })
    expect(jar.has('session')).toBe(false)
  })

  it('counts an address that has no account the same way, so a failure does not tell whether it exists', async () => {
    const known = await login(undefined, form('ada@example.test', 'wrong-password-1'))
    const unknown = await login(undefined, form('nobody@example.test', 'wrong-password-1'))
    expect(unknown?.message).toBe(known?.message)
    expect(await attempts('nobody@example.test')).toBe(1)
  })

  it('keeps one address from blocking another', async () => {
    await createUser('grace@example.test', 'right-password-2')
    for (let i = 0; i < 5; i++) await login(undefined, form('ada@example.test', 'wrong-password-1'))
    await expect(login(undefined, form('grace@example.test', 'right-password-2'))).rejects.toThrow('REDIRECT /')
  })

  it('lets the user in again once the window is over, and starts the count again', async () => {
    for (let i = 0; i < 5; i++) await login(undefined, form('ada@example.test', 'wrong-password-1'))
    await pool.query("UPDATE login_attempts SET reset_at = now() - interval '1 minute'")
    await login(undefined, form('ada@example.test', 'wrong-password-1'))
    expect(await attempts('ada@example.test')).toBe(1)
    await expect(login(undefined, form('ada@example.test', 'right-password-1'))).rejects.toThrow('REDIRECT /')
    expect(jar.has('session')).toBe(true)
  })
})
