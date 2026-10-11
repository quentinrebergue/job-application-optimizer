import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('server-only', () => ({}))
const query = vi.fn()
vi.mock('@/lib/db', () => ({ pool: { query: (...a: unknown[]) => query(...a) } }))

const store = { get: vi.fn(), set: vi.fn(), delete: vi.fn() }
vi.mock('next/headers', () => ({ cookies: async () => store }))

const { createSession, getSessionUserId, deleteSession, deleteAllSessions } = await import('./session')

beforeEach(() => {
  query.mockReset().mockResolvedValue({ rows: [] })
  store.get.mockReset()
  store.set.mockReset()
  store.delete.mockReset()
})
afterEach(() => vi.unstubAllEnvs())

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

describe('createSession', () => {
  it('stores a random id for the user, for 7 days, and gives the browser that id in a cookie', async () => {
    await createSession('u1')
    const [sql, params] = query.mock.calls[0]
    expect(sql).toContain('INSERT INTO sessions')
    const [id, userId, expiresAt] = params as [string, string, Date]
    expect(id).toMatch(/^[0-9a-f]{64}$/)
    expect(userId).toBe('u1')
    expect(expiresAt.getTime() - Date.now()).toBeGreaterThan(WEEK_MS - 5000)
    expect(expiresAt.getTime() - Date.now()).toBeLessThanOrEqual(WEEK_MS)
    expect(store.set).toHaveBeenCalledWith('session', id, expect.objectContaining({ expires: expiresAt }))
  })

  it('never gives the same id twice (a session id is a secret: 32 random bytes)', async () => {
    await createSession('u1')
    await createSession('u1')
    expect(query.mock.calls[0][1][0]).not.toBe(query.mock.calls[1][1][0])
  })

  it('sets a cookie the page script cannot read, that other sites do not send, for the whole site', async () => {
    await createSession('u1')
    expect(store.set.mock.calls[0][2]).toMatchObject({ httpOnly: true, sameSite: 'lax', path: '/' })
  })

  it('marks the cookie secure in production only (a local http server must still work)', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    await createSession('u1')
    expect(store.set.mock.calls[0][2].secure).toBe(true)
    vi.stubEnv('NODE_ENV', 'development')
    await createSession('u1')
    expect(store.set.mock.calls[1][2].secure).toBe(false)
  })
})

describe('getSessionUserId', () => {
  it('is nobody without a cookie, and does not even ask the database', async () => {
    store.get.mockReturnValue(undefined)
    expect(await getSessionUserId()).toBeNull()
    expect(query).not.toHaveBeenCalled()
  })

  it('is nobody for an id that is unknown or expired: the database finds no row', async () => {
    store.get.mockReturnValue({ value: 'stale-id' })
    query.mockResolvedValue({ rows: [] })
    expect(await getSessionUserId()).toBeNull()
    expect(query.mock.calls[0][1]).toEqual(['stale-id'])
  })

  it('asks only for a session that has not expired, in the query itself', async () => {
    store.get.mockReturnValue({ value: 'abc' })
    await getSessionUserId()
    expect(query.mock.calls[0][0]).toMatch(/expires_at\s*>\s*now\(\)/)
  })

  it('is the user of the session when there is a live one', async () => {
    store.get.mockReturnValue({ value: 'abc' })
    query.mockResolvedValue({ rows: [{ user_id: 'u1' }] })
    expect(await getSessionUserId()).toBe('u1')
  })

  it('reads the cookie called session', async () => {
    store.get.mockReturnValue(undefined)
    await getSessionUserId()
    expect(store.get).toHaveBeenCalledWith('session')
  })
})

describe('deleteSession', () => {
  it('removes the session from the database and the cookie from the browser', async () => {
    store.get.mockReturnValue({ value: 'abc' })
    await deleteSession()
    expect(query.mock.calls[0][0]).toContain('DELETE FROM sessions WHERE id = $1')
    expect(query.mock.calls[0][1]).toEqual(['abc'])
    expect(store.delete).toHaveBeenCalledWith('session')
  })

  it('still clears the cookie when there is no session to delete', async () => {
    store.get.mockReturnValue(undefined)
    await deleteSession()
    expect(query).not.toHaveBeenCalled()
    expect(store.delete).toHaveBeenCalledWith('session')
  })
})

describe('deleteAllSessions', () => {
  it('signs the user out of every device, which a password reset relies on', async () => {
    await deleteAllSessions('u1')
    expect(query).toHaveBeenCalledWith('DELETE FROM sessions WHERE user_id = $1', ['u1'])
  })
})
