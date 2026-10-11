import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))
const getSessionUserId = vi.fn()
vi.mock('@/lib/auth/session', () => ({ getSessionUserId: () => getSessionUserId() }))
const findUserById = vi.fn()
vi.mock('@/lib/data/users', () => ({ findUserById: (...a: unknown[]) => findUserById(...a) }))
const redirect = vi.fn((path: string) => {
  throw new Error(`REDIRECT ${path}`)
})
vi.mock('next/navigation', () => ({ redirect: (p: string) => redirect(p) }))

const { verifySession, getCurrentUser } = await import('./dal')

beforeEach(() => {
  getSessionUserId.mockReset()
  findUserById.mockReset()
  redirect.mockClear()
})

describe('verifySession', () => {
  it('sends a visitor with no session to the cleaning route, which opens /login: the page never renders', async () => {
    getSessionUserId.mockResolvedValue(null)
    await expect(verifySession()).rejects.toThrow('REDIRECT /session-expired')
  })

  it('gives the id of the signed-in user', async () => {
    getSessionUserId.mockResolvedValue('u1')
    await expect(verifySession()).resolves.toEqual({ userId: 'u1' })
    expect(redirect).not.toHaveBeenCalled()
  })
})

describe('getCurrentUser', () => {
  it('is null without a session, and does not look anybody up', async () => {
    getSessionUserId.mockResolvedValue(null)
    expect(await getCurrentUser()).toBeNull()
    expect(findUserById).not.toHaveBeenCalled()
  })

  it('is the user of the session', async () => {
    getSessionUserId.mockResolvedValue('u1')
    findUserById.mockResolvedValue({ id: 'u1', email: 'a@example.test' })
    expect(await getCurrentUser()).toEqual({ id: 'u1', email: 'a@example.test' })
    expect(findUserById).toHaveBeenCalledWith('u1')
  })

  it('is null when the session names a user that no longer exists (a deleted account)', async () => {
    getSessionUserId.mockResolvedValue('u-gone')
    findUserById.mockResolvedValue(null)
    expect(await getCurrentUser()).toBeNull()
  })
})
