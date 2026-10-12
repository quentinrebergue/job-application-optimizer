// The cleanup of what the app keeps only for a while, against a real Postgres (#213): what is past its time goes,
// what is still live stays, and nothing of anybody's content is touched.
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import type { Pool } from 'pg'
import { dbDescribe, getPool, makeUser, resetData } from '@/tests/db/helpers'
import { createEmailToken } from '@/lib/data/email-tokens'
import { createEntity } from '@/lib/data/entities'
import { createJob } from '@/lib/data/jobs'
import { purgeExpiredData } from './maintenance'

let pool: Pool
const rows = async (sql: string) => (await pool.query(sql)).rows.map((r) => Object.values(r)[0] as string)

dbDescribe('the cleanup of expired data on Postgres', () => {
  beforeAll(async () => {
    pool = await getPool()
  })
  beforeEach(async () => {
    await resetData(pool)
  })
  afterAll(async () => {
    await pool.end()
  })

  it('deletes the counters whose window is over, with the addresses and the emails typed, and keeps the live ones', async () => {
    await pool.query("INSERT INTO rate_limits (key, count, reset_at) VALUES ('old-ip', 5, now() - interval '1 minute'), ('live-ip', 5, now() + interval '10 minutes')")
    await pool.query("INSERT INTO login_attempts (email, count, reset_at) VALUES ('old@example.test', 2, now() - interval '1 minute'), ('live@example.test', 2, now() + interval '10 minutes')")
    const purged = await purgeExpiredData()
    expect(purged).toMatchObject({ rate_limits: 1, login_attempts: 1 })
    expect(await rows('SELECT key FROM rate_limits')).toEqual(['live-ip'])
    expect(await rows('SELECT email FROM login_attempts')).toEqual(['live@example.test'])
  })

  it('deletes the sessions that expired, and keeps the ones still valid', async () => {
    const user = await makeUser(pool)
    await pool.query("INSERT INTO sessions (id, user_id, expires_at) VALUES ('expired', $1, now() - interval '1 minute'), ('valid', $1, now() + interval '1 day')", [user])
    expect((await purgeExpiredData()).sessions).toBe(1)
    expect(await rows('SELECT id FROM sessions')).toEqual(['valid'])
  })

  it('deletes the links of the mails a day after they expire, and keeps the others', async () => {
    const user = await makeUser(pool)
    await createEmailToken(user, 'change-email', -(25 * 3_600_000), 'typed@example.test')
    await createEmailToken(user, 'verify', -1000)
    await createEmailToken(user, 'verify', 3_600_000)
    expect((await purgeExpiredData()).email_tokens).toBe(1)
    expect(await rows('SELECT count(*) FROM email_tokens')).toEqual(['2'])
  })

  describe('the AI calls: the current and the previous month stay, the rest becomes a monthly total (#213)', () => {
    const NOW = new Date('2026-10-12T12:00:00Z')
    const call = (createdAt: string, model: string | null, cost: number, user: string | null = null) =>
      pool.query(
        "INSERT INTO ai_usage (user_id, feature, model, status, prompt_tokens, completion_tokens, cost_eur, created_at) VALUES ($1, 'rank', $2, 'done', 1000, 100, $3, $4)",
        [user, model, cost, createdAt],
      )
    const monthly = async () =>
      (await pool.query("SELECT to_char(month, 'YYYY-MM') AS month, model, calls, prompt_tokens::int AS prompt, completion_tokens::int AS completion, cost_eur::float AS cost FROM ai_usage_monthly ORDER BY month, model")).rows

    it('keeps every call of the current and of the previous calendar month, and deletes the ones before', async () => {
      await call('2026-08-31T23:59:00Z', 'small', 0.01)
      await call('2026-09-01T00:01:00Z', 'small', 0.01)
      await call('2026-09-30T12:00:00Z', 'small', 0.01)
      await call('2026-10-01T00:01:00Z', 'small', 0.01)
      expect((await purgeExpiredData(NOW)).ai_usage).toBe(1)
      expect(await rows('SELECT count(*) FROM ai_usage')).toEqual(['3'])
    })

    it('adds the deleted calls up per month and model, and the totals are exactly what was deleted', async () => {
      const user = await makeUser(pool)
      await call('2026-07-03T10:00:00Z', 'small', 0.001, user)
      await call('2026-07-20T10:00:00Z', 'small', 0.002)
      await call('2026-07-21T10:00:00Z', 'medium', 0.05, user)
      await call('2026-08-05T10:00:00Z', 'small', 0.004)
      const before = (await pool.query('SELECT count(*)::int AS n, sum(cost_eur)::float AS cost, sum(prompt_tokens)::int AS p FROM ai_usage')).rows[0]
      expect((await purgeExpiredData(NOW)).ai_usage).toBe(4)
      expect(await monthly()).toEqual([
        { month: '2026-07', model: 'medium', calls: 1, prompt: 1000, completion: 100, cost: 0.05 },
        { month: '2026-07', model: 'small', calls: 2, prompt: 2000, completion: 200, cost: 0.003 },
        { month: '2026-08', model: 'small', calls: 1, prompt: 1000, completion: 100, cost: 0.004 },
      ])
      const after = (await pool.query('SELECT sum(calls)::int AS n, sum(cost_eur)::float AS cost, sum(prompt_tokens)::int AS p FROM ai_usage_monthly')).rows[0]
      expect(after.n).toBe(before.n)
      expect(after.cost).toBeCloseTo(before.cost, 6)
      expect(after.p).toBe(before.p)
    })

    it('keeps no identity in the totals: the table has no user, and the deleted rows leave nothing behind', async () => {
      const user = await makeUser(pool)
      await call('2026-06-10T10:00:00Z', 'small', 0.01, user)
      await purgeExpiredData(NOW)
      const columns = (await pool.query("SELECT column_name FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'ai_usage_monthly'")).rows.map((r) => r.column_name)
      expect(columns).not.toContain('user_id')
      expect(await rows('SELECT count(*) FROM ai_usage')).toEqual(['0'])
    })

    it('does nothing the second time: running it again adds nothing', async () => {
      await call('2026-07-03T10:00:00Z', 'small', 0.01)
      await purgeExpiredData(NOW)
      const first = await monthly()
      expect((await purgeExpiredData(NOW)).ai_usage).toBe(0)
      expect(await monthly()).toEqual(first)
    })

    it('adds a later pass to the month already summed: two passes on the same month give one total', async () => {
      await call('2026-07-03T10:00:00Z', 'small', 0.01)
      await purgeExpiredData(NOW)
      // A row of July that arrives late (a call settled after the first pass).
      await call('2026-07-30T10:00:00Z', 'small', 0.02)
      await purgeExpiredData(NOW)
      expect(await monthly()).toEqual([{ month: '2026-07', model: 'small', calls: 2, prompt: 2000, completion: 200, cost: 0.03 }])
    })

    it('counts a call that never got an answer (no model) under "unknown", and cuts the months in UTC', async () => {
      await call('2026-08-31T23:30:00Z', null, 0.01)
      await call('2026-09-01T00:30:00Z', null, 0.01)
      await purgeExpiredData(NOW)
      expect(await monthly()).toEqual([{ month: '2026-08', model: 'unknown', calls: 1, prompt: 1000, completion: 100, cost: 0.01 }])
    })

    it('leaves the monthly cap as it was: it reads the rows of the current month, which are never touched', async () => {
      await call('2026-10-02T10:00:00Z', 'small', 0.25)
      await call('2026-10-09T10:00:00Z', 'small', 0.25)
      await call('2026-06-09T10:00:00Z', 'small', 9)
      await purgeExpiredData(NOW)
      const { rows } = await pool.query("SELECT coalesce(sum(cost_eur), 0)::float AS eur FROM ai_usage WHERE created_at >= '2026-10-01T00:00:00Z'")
      expect(rows[0].eur).toBe(0.5)
    })
  })

  it('never touches the content of anybody: accounts, jobs and library entries stay', async () => {
    const user = await makeUser(pool)
    await createJob(user, { company: 'Acme', title: 'Dev', description: 'Build', status: 'saved', tags: [] })
    await createEntity(user, 'skills', { category: 'Languages', items: ['Go'], tags: ['Go'] } as never)
    await purgeExpiredData(new Date(Date.now() + 5 * 365 * 24 * 3_600_000))
    expect(await rows('SELECT count(*) FROM users')).toEqual(['1'])
    expect(await rows('SELECT count(*) FROM jobs')).toEqual(['1'])
    expect(await rows('SELECT count(*) FROM entities')).toEqual(['1'])
  })

  it('has nothing to delete on an empty or fresh database, and says so', async () => {
    expect(await purgeExpiredData()).toEqual({ rate_limits: 0, login_attempts: 0, sessions: 0, email_tokens: 0, ai_usage: 0 })
  })
})
