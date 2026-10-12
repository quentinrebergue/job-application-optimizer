// The limit on failed logins against a real Postgres (#221): 5 failures in 15 minutes per address, counted in
// login_attempts. The hashing is replaced by a fast stand-in (bcrypt at 12 rounds takes a quarter of a second a
// try, and what is tested here is the counting, not bcrypt: that is checked in users.db.test.ts).
import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll, vi } from 'vitest'
import type { Pool } from 'pg'
import { dbDescribe, getPool, resetData } from '@/tests/db/helpers'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/auth/password', () => ({
  hashPassword: async (plain: string) => `fast-hash:${plain}`,
  verifyPassword: async (plain: string, hash: string) => hash === `fast-hash:${plain}`,
  UNKNOWN_ACCOUNT_HASH: 'fast-hash:nobody-knows-this',
}))
const jar = new Map<string, string>()
/** The address the ingress passes (X-Real-IP); null for none. */
let visitor: string | null = null
vi.mock('next/headers', () => ({
  headers: async () => new Headers(visitor ? { 'x-real-ip': visitor } : {}),
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
import { resetLoginPurge } from '@/lib/auth/login-limit'

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
    visitor = null
    await createUser('ada@example.test', 'right-password-1')
  })
  afterEach(() => vi.unstubAllEnvs())
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

  describe('failures per address (#225)', () => {
    const failuresOf = async (ip: string) => (await pool.query('SELECT count FROM rate_limits WHERE key = $1', [`login-fail-ip:${ip}`])).rows[0]?.count

    beforeEach(() => vi.stubEnv('LOGIN_FAILS_PER_IP_PER_HOUR', '3'))

    it('counts the failures of an address across different accounts, and refuses it once the limit is used up', async () => {
      visitor = '203.0.113.7'
      await login(undefined, form('ada@example.test', 'wrong-password-1'))
      await login(undefined, form('nobody@example.test', 'wrong-password-1'))
      await login(undefined, form('other@example.test', 'wrong-password-1'))
      expect(await failuresOf('203.0.113.7')).toBe(3)
      // Even the right password of a real account is refused: the address has to wait.
      const fourth = await login(undefined, form('ada@example.test', 'right-password-1'))
      expect(fourth).toMatchObject({ message: expect.stringContaining('Too many failed attempts from your network') })
      expect(jar.has('session')).toBe(false)
    })

    it('does not count a success, and a student who fails twice then gets in is not punished', async () => {
      visitor = '203.0.113.7'
      await login(undefined, form('ada@example.test', 'wrong-password-1'))
      await login(undefined, form('ada@example.test', 'wrong-password-1'))
      await expect(login(undefined, form('ada@example.test', 'right-password-1'))).rejects.toThrow('REDIRECT /')
      expect(await failuresOf('203.0.113.7')).toBe(2)
    })

    it('leaves another address alone: one machine does not block the others', async () => {
      visitor = '203.0.113.7'
      for (let i = 0; i < 3; i++) await login(undefined, form(`x${i}@example.test`, 'wrong-password-1'))
      visitor = '198.51.100.9'
      await expect(login(undefined, form('ada@example.test', 'right-password-1'))).rejects.toThrow('REDIRECT /')
    })

    it('lets the address try again once its hour is over', async () => {
      visitor = '203.0.113.7'
      for (let i = 0; i < 3; i++) await login(undefined, form(`x${i}@example.test`, 'wrong-password-1'))
      await pool.query("UPDATE rate_limits SET reset_at = now() - interval '1 minute' WHERE key LIKE 'login-fail-ip:%'")
      await expect(login(undefined, form('ada@example.test', 'right-password-1'))).rejects.toThrow('REDIRECT /')
    })

    it('does not limit a private address, shared by every visitor, and still counts for the site', async () => {
      visitor = '10.2.0.146'
      for (let i = 0; i < 5; i++) await login(undefined, form(`x${i}@example.test`, 'wrong-password-1'))
      await expect(login(undefined, form('ada@example.test', 'right-password-1'))).rejects.toThrow('REDIRECT /')
      expect((await pool.query("SELECT count FROM rate_limits WHERE key = 'login-fail-all:hour'")).rows[0].count).toBe(5)
    })

    it('treats one IPv6 /64 as one address', async () => {
      for (const ip of ['2001:db8:1:2:aaaa::1', '2001:db8:1:2:bbbb::2', '2001:db8:1:2:cccc::3']) {
        visitor = ip
        await login(undefined, form('nobody@example.test', 'wrong-password-1'))
      }
      expect(await failuresOf('2001:db8:1:2::/64')).toBe(3)
    })
    it('holds when the attempts are sent at the same moment: 20 at once on different accounts let only the limit through', async () => {
      visitor = '203.0.113.7'
      const answers = await Promise.all(Array.from({ length: 20 }, (_, i) => login(undefined, form(`x${i}@example.test`, 'wrong-password-1'))))
      expect(answers.filter((a) => a?.message === 'Wrong email or password.')).toHaveLength(3)
      expect(answers.filter((a) => a?.message?.startsWith('Too many failed attempts'))).toHaveLength(17)
    })
  })

  describe('the limit per email when the attempts are sent at the same moment (#225)', () => {
    it('lets 5 of 20 simultaneous guesses at one account through, not all of them', async () => {
      const answers = await Promise.all(Array.from({ length: 20 }, () => login(undefined, form('ada@example.test', 'wrong-password-1'))))
      expect(answers.filter((a) => a?.message === 'Wrong email or password.')).toHaveLength(5)
      expect(answers.filter((a) => a?.message === 'Too many attempts. Try again in 15 minutes.')).toHaveLength(15)
    })

    it('gives a success its point back: failures, then the right password, leave the count at the failures', async () => {
      await login(undefined, form('ada@example.test', 'wrong-password-1'))
      await login(undefined, form('ada@example.test', 'wrong-password-1'))
      await expect(login(undefined, form('ada@example.test', 'right-password-1'))).rejects.toThrow('REDIRECT /')
      expect(await attempts('ada@example.test')).toBe(2)
    })
  })

  describe('what a failed login cleans up (#225)', () => {
    it('deletes the counters whose window is over, with the addresses and the emails typed, and keeps the live ones', async () => {
      await pool.query("INSERT INTO login_attempts (email, count, reset_at) VALUES ('old@example.test', 2, now() - interval '1 hour'), ('live@example.test', 2, now() + interval '10 minutes')")
      await pool.query("INSERT INTO rate_limits (key, count, reset_at) VALUES ('login-fail-ip:198.51.100.1', 5, now() - interval '1 hour'), ('login-fail-ip:198.51.100.2', 5, now() + interval '10 minutes')")
      resetLoginPurge()
      await login(undefined, form('ada@example.test', 'wrong-password-1'))
      // The cleanup runs after the response (after()): wait for it.
      await vi.waitFor(async () => {
        expect((await pool.query('SELECT email FROM login_attempts ORDER BY email')).rows.map((r) => r.email)).toEqual(['ada@example.test', 'live@example.test'])
        expect((await pool.query("SELECT key FROM rate_limits WHERE key LIKE 'login-fail-ip:198%' ORDER BY key")).rows.map((r) => r.key)).toEqual(['login-fail-ip:198.51.100.2'])
      })
    })
  })
})
