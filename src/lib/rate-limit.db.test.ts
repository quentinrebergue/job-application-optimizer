// The counters of the rate limits against a real Postgres (#221): a window that starts again, and two
// requests at once that cannot both slip through.
import { it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import type { Pool } from 'pg'
import { dbDescribe, getPool, resetData } from '@/tests/db/helpers'
import { consumeRateLimit, deleteExpiredRateLimits, refundRateLimit } from './rate-limit'

const HOUR = 60 * 60 * 1000
const NOW = new Date('2026-10-15T12:00:00Z')

let pool: Pool

dbDescribe('rate limits on Postgres', () => {
  beforeAll(async () => {
    pool = await getPool()
  })
  beforeEach(async () => {
    await resetData(pool)
  })
  afterAll(async () => {
    await pool.end()
  })

  it('counts the hits of a window and refuses after the limit, with the time left', async () => {
    const results = []
    for (let i = 0; i < 4; i++) results.push(await consumeRateLimit('k', 3, HOUR, NOW))
    expect(results.map((r) => r.allowed)).toEqual([true, true, true, false])
    expect(results.map((r) => r.count)).toEqual([1, 2, 3, 4])
    expect(results[3].retryAfterMs).toBe(HOUR)
  })

  it('says how much of the window is left on a later hit', async () => {
    await consumeRateLimit('k', 3, HOUR, NOW)
    const later = await consumeRateLimit('k', 3, HOUR, new Date(NOW.getTime() + 20 * 60_000))
    expect(later.retryAfterMs).toBe(40 * 60_000)
  })

  it('starts a new window once the old one is over, back to one hit', async () => {
    for (let i = 0; i < 5; i++) await consumeRateLimit('k', 3, HOUR, NOW)
    const next = await consumeRateLimit('k', 3, HOUR, new Date(NOW.getTime() + HOUR + 1))
    expect(next).toMatchObject({ allowed: true, count: 1 })
    expect(next.retryAfterMs).toBe(HOUR)
  })

  it('keeps two keys apart', async () => {
    for (let i = 0; i < 4; i++) await consumeRateLimit('a', 3, HOUR, NOW)
    expect((await consumeRateLimit('b', 3, HOUR, NOW)).allowed).toBe(true)
  })

  it('lets exactly the limit through when 20 requests arrive at the same time', async () => {
    const results = await Promise.all(Array.from({ length: 20 }, () => consumeRateLimit('burst', 5, HOUR, NOW)))
    expect(results.filter((r) => r.allowed)).toHaveLength(5)
    expect(results.map((r) => r.count).sort((a, b) => a - b)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1))
  })

  it('removes the windows that are over and keeps the others', async () => {
    await consumeRateLimit('old', 3, HOUR, new Date(NOW.getTime() - 2 * HOUR))
    await consumeRateLimit('live', 3, HOUR, NOW)
    expect(await deleteExpiredRateLimits(NOW)).toBe(1)
    const { rows } = await pool.query('SELECT key FROM rate_limits')
    expect(rows).toEqual([{ key: 'live' }])
  })

  it('gives a hit back while the window runs, never under zero, and not once the window is over (#225)', async () => {
    await consumeRateLimit('k', 3, HOUR, NOW)
    await consumeRateLimit('k', 3, HOUR, NOW)
    await refundRateLimit('k', new Date(NOW.getTime() + 10 * 60_000))
    expect((await consumeRateLimit('k', 3, HOUR, new Date(NOW.getTime() + 11 * 60_000))).count).toBe(2)
    await refundRateLimit('k', NOW)
    await refundRateLimit('k', NOW)
    await refundRateLimit('k', NOW)
    expect((await pool.query("SELECT count FROM rate_limits WHERE key = 'k'")).rows[0].count).toBe(0)
    // After the window, the counter is not touched: the next hit starts a new window at 1.
    await refundRateLimit('k', new Date(NOW.getTime() + 2 * HOUR))
    expect((await consumeRateLimit('k', 3, HOUR, new Date(NOW.getTime() + 2 * HOUR))).count).toBe(1)
  })

  it('counts attempts sent at the same moment in one step: no more than the limit slip through, whatever their number', async () => {
    const results = await Promise.all(Array.from({ length: 50 }, () => consumeRateLimit('burst', 10, HOUR, NOW)))
    expect(results.filter((r) => r.allowed)).toHaveLength(10)
  })
})
