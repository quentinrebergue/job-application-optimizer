import { describe, it, expect, vi, beforeEach } from 'vitest'

const query = vi.fn()
vi.mock('@/lib/db', () => ({ pool: { query: (...args: unknown[]) => query(...args) } }))

const { createEmailToken, consumeEmailToken, peekEmailToken, hashToken } = await import('./email-tokens')

beforeEach(() => {
  query.mockReset()
})

describe('createEmailToken', () => {
  it('returns a random URL-safe token and stores only its hash', async () => {
    query.mockResolvedValue({ rows: [] })
    const token = await createEmailToken('u1', 'verify', 60_000)
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/)
    const params = query.mock.calls[0][1] as unknown[]
    expect(params[0]).toBe(hashToken(token))
    expect(params).not.toContain(token)
  })
})

describe('consumeEmailToken', () => {
  it('returns the user of a valid token', async () => {
    query.mockResolvedValueOnce({ rows: [{ user_id: 'u1' }] })
    expect(await consumeEmailToken('t', 'verify')).toEqual({ userId: 'u1' })
  })

  it('tells an unknown token apart from a used or an expired one', async () => {
    query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [] })
    expect(await consumeEmailToken('t', 'verify')).toEqual({ failure: 'invalid' })

    query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{ used_at: new Date() }] })
    expect(await consumeEmailToken('t', 'verify')).toEqual({ failure: 'used' })

    query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{ used_at: null }] })
    expect(await consumeEmailToken('t', 'verify')).toEqual({ failure: 'expired' })
  })
})

describe('peekEmailToken', () => {
  it('returns the user of a valid token without marking it used', async () => {
    query.mockResolvedValueOnce({ rows: [{ user_id: 'u1' }] })
    expect(await peekEmailToken('t', 'reset')).toEqual({ userId: 'u1' })
    expect(query.mock.calls[0][0]).toMatch(/^\s*SELECT/)
  })

  it('says why a token is refused', async () => {
    query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{ used_at: null }] })
    expect(await peekEmailToken('t', 'reset')).toEqual({ failure: 'expired' })
  })
})
