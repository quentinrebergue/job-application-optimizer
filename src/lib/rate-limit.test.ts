import { describe, it, expect, vi, beforeEach } from 'vitest'

const query = vi.fn()
vi.mock('@/lib/db', () => ({ pool: { query: (...args: unknown[]) => query(...args) } }))

const { consumeRateLimit, clientIp, isPublicIp } = await import('./rate-limit')

const NOW = new Date('2026-10-07T12:00:00Z')
const HOUR = 60 * 60 * 1000

beforeEach(() => {
  query.mockReset()
})

describe('consumeRateLimit', () => {
  it('allows hits up to the limit', async () => {
    query.mockResolvedValue({ rows: [{ count: 3, reset_at: new Date(NOW.getTime() + HOUR) }] })
    expect(await consumeRateLimit('k', 3, HOUR, NOW)).toEqual({ allowed: true, retryAfterMs: HOUR })
  })

  it('refuses the hit after the limit and says when to retry', async () => {
    query.mockResolvedValue({ rows: [{ count: 4, reset_at: new Date(NOW.getTime() + 10 * 60_000) }] })
    expect(await consumeRateLimit('k', 3, HOUR, NOW)).toEqual({ allowed: false, retryAfterMs: 10 * 60_000 })
  })

  it('sends the key, the end of a new window and the current time', async () => {
    query.mockResolvedValue({ rows: [{ count: 1, reset_at: new Date(NOW.getTime() + HOUR) }] })
    await consumeRateLimit('reset-ip:203.0.113.7', 10, HOUR, NOW)
    expect(query.mock.calls[0][1]).toEqual(['reset-ip:203.0.113.7', new Date(NOW.getTime() + HOUR), NOW])
  })
})

describe('clientIp', () => {
  it('prefers X-Real-IP', () => {
    expect(clientIp(new Headers({ 'x-real-ip': '203.0.113.7', 'x-forwarded-for': '198.51.100.1' }))).toBe('203.0.113.7')
  })

  it('falls back to the first X-Forwarded-For entry', () => {
    expect(clientIp(new Headers({ 'x-forwarded-for': '198.51.100.1, 10.2.0.5' }))).toBe('198.51.100.1')
  })

  it('returns null without either header', () => {
    expect(clientIp(new Headers())).toBeNull()
  })
})

describe('isPublicIp', () => {
  it('rejects addresses shared by every visitor behind a load balancer', () => {
    for (const ip of ['10.2.0.5', '172.16.0.1', '172.31.255.1', '192.168.1.1', '100.64.0.1', '127.0.0.1', '::1', 'fd00::1', '::ffff:10.0.0.1']) {
      expect(isPublicIp(ip), ip).toBe(false)
    }
  })

  it('accepts public addresses', () => {
    for (const ip of ['203.0.113.7', '86.244.1.2', '172.32.0.1', '2a01:cb00::1']) {
      expect(isPublicIp(ip), ip).toBe(true)
    }
  })
})
