// The sessions against a real Postgres (#221): what makes a visitor signed in, for how long, and what signs them out.
import { it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest'
import type { Pool } from 'pg'
import { dbDescribe, getPool, makeUser, resetData } from '@/tests/db/helpers'

vi.mock('server-only', () => ({}))
// The browser's cookies, as a map: what createSession sets is what getSessionUserId reads back.
const jar = new Map<string, string>()
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { value: jar.get(name) } : undefined),
    set: (name: string, value: string) => void jar.set(name, value),
    delete: (name: string) => void jar.delete(name),
  }),
}))

import { createSession, deleteAllSessions, deleteSession, getSessionUserId } from './session'

let pool: Pool

dbDescribe('sessions on Postgres', () => {
  beforeAll(async () => {
    pool = await getPool()
  })
  beforeEach(async () => {
    await resetData(pool)
    jar.clear()
  })
  afterAll(async () => {
    await pool.end()
  })

  const sessions = async () => (await pool.query('SELECT id, user_id, expires_at FROM sessions')).rows

  it('signs a user in: the cookie names a row, and that row is the user', async () => {
    const user = await makeUser(pool)
    await createSession(user)
    const [row] = await sessions()
    expect(jar.get('session')).toBe(row.id)
    expect(row.user_id).toBe(user)
    expect(await getSessionUserId()).toBe(user)
  })

  it('lasts 7 days', async () => {
    await createSession(await makeUser(pool))
    const [row] = await sessions()
    const left = new Date(row.expires_at).getTime() - Date.now()
    expect(left).toBeGreaterThan(7 * 24 * 3600_000 - 60_000)
    expect(left).toBeLessThanOrEqual(7 * 24 * 3600_000)
  })

  it('is nobody once the session has expired, in the database', async () => {
    await createSession(await makeUser(pool))
    await pool.query("UPDATE sessions SET expires_at = now() - interval '1 second'")
    expect(await getSessionUserId()).toBeNull()
  })

  it('is nobody for a cookie that names no session, and with no cookie at all', async () => {
    jar.set('session', 'a-made-up-id')
    expect(await getSessionUserId()).toBeNull()
    jar.clear()
    expect(await getSessionUserId()).toBeNull()
  })

  it('signs out: the row and the cookie are gone', async () => {
    await createSession(await makeUser(pool))
    await deleteSession()
    expect(await sessions()).toEqual([])
    expect(jar.has('session')).toBe(false)
    expect(await getSessionUserId()).toBeNull()
  })

  it('signs a user out of every device without touching anyone else (the password reset)', async () => {
    const [a, b] = [await makeUser(pool), await makeUser(pool)]
    await createSession(a)
    await createSession(a)
    await createSession(b)
    expect(await sessions()).toHaveLength(3)
    await deleteAllSessions(a)
    const left = await sessions()
    expect(left).toHaveLength(1)
    expect(left[0].user_id).toBe(b)
  })

  it('gives each sign-in a session of its own', async () => {
    const user = await makeUser(pool)
    await createSession(user)
    const first = jar.get('session')
    await createSession(user)
    expect(jar.get('session')).not.toBe(first)
    expect(await sessions()).toHaveLength(2)
  })
})
