// The accounting of the AI against a real Postgres (#221). The unit tests of usage.ts use a fake pool and
// check that the right queries are sent; these check that the queries work: the lock, the windows, the
// month, the money.
import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll, vi } from 'vitest'
import type { Pool } from 'pg'
import { dbDescribe, getPool, makeUser, resetData } from '@/tests/db/helpers'
import { reserveAiCall, settleAiCall, worstCaseCost, timeoutCost } from './usage'

const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR

let pool: Pool
const rows = async (sql = 'SELECT * FROM ai_usage ORDER BY id') => (await pool.query(sql)).rows
const insertCall = (userId: string | null, createdAt: Date, cost: number, status = 'done') =>
  pool.query(`INSERT INTO ai_usage (user_id, feature, status, cost_eur, created_at) VALUES ($1, 'rank', $2, $3, $4)`, [userId, status, cost, createdAt])

dbDescribe('AI usage on Postgres', () => {
  beforeAll(async () => {
    pool = await getPool()
  })
  beforeEach(async () => {
    await resetData(pool)
  })
  afterEach(() => vi.unstubAllEnvs())
  afterAll(async () => {
    await pool.end()
  })

  describe('calls at the same time', () => {
    it('lets exactly 10 through of 15 at once for one user: the lock makes the check and the write one step', async () => {
      const user = await makeUser(pool)
      const results = await Promise.all(Array.from({ length: 15 }, () => reserveAiCall(user, 'rank')))
      expect(results.filter((r) => !r.denied)).toHaveLength(10)
      expect(results.filter((r) => r.denied)).toHaveLength(5)
      expect(await rows()).toHaveLength(10)
    })

    it('does not let the site go over its monthly cap when many users ask at once', async () => {
      // At the dearest price one call is reserved at about 0.051 EUR: a cap of 0.2 holds three.
      vi.stubEnv('AI_MONTHLY_CAP_EUR', '0.2')
      const users = await Promise.all(Array.from({ length: 10 }, () => makeUser(pool)))
      const results = await Promise.all(users.map((u) => reserveAiCall(u, 'rank')))
      expect(results.filter((r) => !r.denied)).toHaveLength(3)
      const denied = results.find((r) => r.denied)
      expect(denied).toMatchObject({ denied: true, status: 503, code: 'ai_monthly_cap', message: 'The AI is paused until next month.' })
      const [{ spent }] = await rows('SELECT sum(cost_eur) AS spent FROM ai_usage')
      expect(Number(spent)).toBeLessThanOrEqual(0.2)
    })
  })

  describe('the windows of one user', () => {
    const NOW = new Date('2026-10-15T12:00:00Z')

    it('counts the calls of the last hour, not the older ones', async () => {
      const user = await makeUser(pool)
      for (let i = 0; i < 10; i++) await insertCall(user, new Date(NOW.getTime() - 61 * MIN - i * MIN), 0.001)
      expect(await reserveAiCall(user, 'rank', NOW)).toMatchObject({ id: expect.any(Number) })
    })

    it('refuses the 11th call within the hour and says when the oldest leaves it', async () => {
      const user = await makeUser(pool)
      for (let i = 0; i < 10; i++) await insertCall(user, new Date(NOW.getTime() - 50 * MIN + i * MIN), 0.001)
      const result = await reserveAiCall(user, 'rank', NOW)
      expect(result).toMatchObject({ denied: true, status: 429, code: 'ai_user_limit', retryAfterSeconds: 600 })
    })

    it('refuses over the day and over the week', async () => {
      const day = await makeUser(pool)
      for (let i = 0; i < 20; i++) await insertCall(day, new Date(NOW.getTime() - 2 * HOUR - i * HOUR / 2), 0.001)
      expect(await reserveAiCall(day, 'rank', NOW)).toMatchObject({ denied: true, message: expect.stringContaining('this day') })
      const week = await makeUser(pool)
      for (let i = 0; i < 50; i++) await insertCall(week, new Date(NOW.getTime() - 2 * DAY - i * HOUR), 0.001)
      expect(await reserveAiCall(week, 'rank', NOW)).toMatchObject({ denied: true, message: expect.stringContaining('this week') })
    })

    it('keeps the users apart: one at the limit does not block another', async () => {
      const [a, b] = [await makeUser(pool), await makeUser(pool)]
      for (let i = 0; i < 10; i++) await insertCall(a, new Date(NOW.getTime() - 10 * MIN - i * MIN), 0.001)
      expect(await reserveAiCall(a, 'rank', NOW)).toMatchObject({ denied: true })
      expect(await reserveAiCall(b, 'rank', NOW)).toMatchObject({ id: expect.any(Number) })
    })
  })

  describe('the month, in UTC', () => {
    it('counts what was spent since the first of the month at midnight UTC, not before', async () => {
      const user = await makeUser(pool)
      const NOW = new Date('2026-03-15T12:00:00Z')
      await insertCall(user, new Date('2026-02-28T23:59:59Z'), 100) // last month: does not count
      expect(await reserveAiCall(user, 'rank', NOW)).toMatchObject({ id: expect.any(Number) })
      await resetData(pool)
      const user2 = await makeUser(pool)
      await insertCall(user2, new Date('2026-03-01T00:00:00Z'), 100) // the first instant of the month: counts
      expect(await reserveAiCall(user2, 'rank', NOW)).toMatchObject({ denied: true, code: 'ai_monthly_cap' })
    })

    it('tells how long until the next month', async () => {
      const user = await makeUser(pool)
      await insertCall(user, new Date('2026-03-02T00:00:00Z'), 100)
      const result = await reserveAiCall(user, 'rank', new Date('2026-03-31T00:00:00Z'))
      expect(result).toMatchObject({ denied: true, retryAfterSeconds: 86_400 })
    })
  })

  describe('the money', () => {
    it('reserves a call at its worst case, then replaces it with the real cost', async () => {
      const user = await makeUser(pool)
      const reservation = await reserveAiCall(user, 'rank')
      if (reservation.denied) throw new Error('expected a reservation')
      const [reserved] = await rows()
      expect(reserved.status).toBe('reserved')
      expect(Number(reserved.cost_eur)).toBeCloseTo(worstCaseCost(), 5)

      await settleAiCall(reservation, { status: 'done', model: 'mistral-small-2603', promptTokens: 2690, completionTokens: 450 })
      const [done] = await rows()
      expect(done).toMatchObject({ status: 'done', model: 'mistral-small-2603', prompt_tokens: 2690, completion_tokens: 450 })
      // The column is NUMERIC(10, 6): the cost is stored to the millionth of a euro (0.0005792 is kept as 0.000579).
      expect(Number(done.cost_eur)).toBeCloseTo((2690 * 0.13 + 450 * 0.51) / 1e6, 6)
      expect(done.cost_eur).toBe('0.000579')
    })

    it('frees room once a call is settled for less than it was reserved', async () => {
      vi.stubEnv('AI_MONTHLY_CAP_EUR', '0.06')
      const [a, b] = [await makeUser(pool), await makeUser(pool)]
      const first = await reserveAiCall(a, 'rank')
      if (first.denied) throw new Error('expected a reservation')
      expect(await reserveAiCall(b, 'rank')).toMatchObject({ denied: true, code: 'ai_monthly_cap' })
      await settleAiCall(first, { status: 'done', model: 'mistral-small-2603', promptTokens: 2690, completionTokens: 450 })
      expect(await reserveAiCall(b, 'rank')).toMatchObject({ id: expect.any(Number) })
    })

    it('prices the next reservation like the model that answered last', async () => {
      const user = await makeUser(pool)
      const first = await reserveAiCall(user, 'rank')
      if (first.denied) throw new Error('expected a reservation')
      await settleAiCall(first, { status: 'done', model: 'mistral-small-2603', promptTokens: 2690, completionTokens: 450 })
      const second = await reserveAiCall(user, 'rank')
      if (second.denied) throw new Error('expected a reservation')
      expect(second.model).toBe('mistral-small-2603')
      const reserved = (await rows()).find((r) => r.id === String(second.id))
      expect(Number(reserved.cost_eur)).toBeCloseTo(worstCaseCost('mistral-small-2603'), 6)
    })

    it('counts a timeout at the price of its prompt, and a call that never reached the AI at nothing', async () => {
      const user = await makeUser(pool)
      const timedOut = await reserveAiCall(user, 'rank')
      if (timedOut.denied) throw new Error('expected a reservation')
      await settleAiCall(timedOut, { status: 'failed', timedOut: true })
      const [row] = await rows()
      expect(row.status).toBe('failed')
      expect(Number(row.cost_eur)).toBeCloseTo(timeoutCost(), 5)

      const refused = await reserveAiCall(user, 'rank')
      if (refused.denied) throw new Error('expected a reservation')
      await settleAiCall(refused, { status: 'released' })
      expect(await rows()).toHaveLength(1)
    })

    it('stores money exactly (NUMERIC, six decimals) and reads the month back as a sum', async () => {
      const user = await makeUser(pool)
      await insertCall(user, new Date(), 0.000579)
      await insertCall(user, new Date(), 0.000579)
      const [{ total }] = await rows('SELECT sum(cost_eur) AS total FROM ai_usage')
      expect(Number(total)).toBeCloseTo(0.001158, 9)
    })

    it('refuses a status the table does not know', async () => {
      const user = await makeUser(pool)
      await expect(insertCall(user, new Date(), 0, 'weird')).rejects.toThrow()
    })
  })

  describe('when a user is deleted', () => {
    it('keeps the calls, without the user: the money spent is still spent', async () => {
      const user = await makeUser(pool)
      await insertCall(user, new Date(), 0.5)
      await pool.query('DELETE FROM users WHERE id = $1', [user])
      const [row] = await rows()
      expect(row.user_id).toBeNull()
      expect(Number(row.cost_eur)).toBe(0.5)
      // and it still counts against the site's cap
      const other = await makeUser(pool)
      vi.stubEnv('AI_MONTHLY_CAP_EUR', '0.5')
      expect(await reserveAiCall(other, 'rank')).toMatchObject({ denied: true, code: 'ai_monthly_cap' })
    })
  })
})
