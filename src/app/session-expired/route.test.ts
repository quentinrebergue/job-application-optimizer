import { describe, it, expect, vi, beforeEach } from 'vitest'

const clearStaleSession = vi.fn()
vi.mock('@/lib/auth/session', () => ({ clearStaleSession: () => clearStaleSession() }))
vi.mock('@/lib/email/providers', () => ({ appUrl: () => 'https://fastresume.tech' }))

const { GET } = await import('./route')

beforeEach(() => clearStaleSession.mockReset())

describe('GET /session-expired (#178)', () => {
  it('opens the login page once the stale cookie is removed', async () => {
    clearStaleSession.mockResolvedValue(true)
    const res = await GET()
    expect(res.headers.get('location')).toBe('https://fastresume.tech/login')
  })

  it('sends a user whose session is valid home, instead of signing them out', async () => {
    clearStaleSession.mockResolvedValue(false)
    const res = await GET()
    expect(res.headers.get('location')).toBe('https://fastresume.tech/')
  })
})
