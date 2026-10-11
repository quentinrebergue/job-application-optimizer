// Export and deletion of an account against a real Postgres (#104). The deletion test counts the rows of
// every table that holds the user, before and after: a table added later that forgets to cascade is found here.
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import type { Pool } from 'pg'
import { dbDescribe, getPool, makeUser, resetData } from '@/tests/db/helpers'
import { createEntity } from './entities'
import { createJob, saveResumeConfig } from './jobs'
import { saveResumeProfile } from './resume-profile'
import { deleteAccount, exportAccount } from './account'

let pool: Pool

const profile = { full_name: 'Ada Lovelace', email: 'ada@example.test', linkedin: '', phone: '', address: '', resume_title: 'Engineer', profile_text: 'Hello', ai_context: '' }

/** Gives a user a row in every table that holds something of theirs. */
async function fill(userId: string, email: string) {
  await saveResumeProfile(userId, profile)
  await createEntity(userId, 'projects', { title: 'Queue', tech: ['Go'], description: 'A queue.', tags: ['Go'] } as never)
  await createEntity(userId, 'skills', { category: 'Languages', items: ['Go'], tags: ['Go'] } as never)
  const job = await createJob(userId, { company: 'Acme', title: 'Dev', description: 'Build', status: 'saved', tags: [] })
  await saveResumeConfig(userId, job.id, { selected_entity_ids: [], ai_rankings: [], profile_text: 'mine' })
  await pool.query(`INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, now() + interval '1 day')`, [`s-${userId}`, userId])
  await pool.query(`INSERT INTO email_tokens (token_hash, user_id, purpose, expires_at) VALUES ($1, $2, 'verify', now() + interval '1 hour')`, [`t-${userId}`, userId])
  await pool.query(`INSERT INTO ai_usage (user_id, feature, status, cost_eur) VALUES ($1, 'rank', 'done', 0.001)`, [userId])
  await pool.query(`INSERT INTO login_attempts (email, count, reset_at) VALUES ($1, 2, now() + interval '1 hour')`, [email])
  await pool.query(`INSERT INTO rate_limits (key, count, reset_at) VALUES ($1, 3, now() + interval '1 hour')`, [`create:job:${userId}:hour`])
}

/** The tables that name a user, and how many rows of each belong to this one. */
async function rowsOf(userId: string): Promise<Record<string, number>> {
  const { rows: tables } = await pool.query<{ table_name: string }>(
    `SELECT table_name FROM information_schema.columns WHERE table_schema = current_schema() AND column_name = 'user_id' ORDER BY table_name`,
  )
  const counts: Record<string, number> = {}
  for (const { table_name } of tables) {
    const { rows } = await pool.query<{ n: string }>(`SELECT count(*) AS n FROM "${table_name}" WHERE user_id = $1`, [userId])
    counts[table_name] = Number(rows[0].n)
  }
  return counts
}

dbDescribe('account on Postgres', () => {
  let alice: string
  let bob: string

  beforeAll(async () => {
    pool = await getPool()
  })
  beforeEach(async () => {
    await resetData(pool)
    alice = await makeUser(pool, 'alice@example.test')
    bob = await makeUser(pool, 'bob@example.test')
    await fill(alice, 'alice@example.test')
    await fill(bob, 'bob@example.test')
  })
  afterAll(async () => {
    await pool.end()
  })

  describe('exportAccount', () => {
    it('gives everything the user holds: account, profile, library, jobs with their resume settings, AI calls', async () => {
      const data = await exportAccount(alice)
      expect(data?.account).toMatchObject({ email: 'alice@example.test', email_verified: false })
      expect(data?.profile).toMatchObject({ full_name: 'Ada Lovelace', resume_title: 'Engineer' })
      expect(data?.library.map((e) => e.type).sort()).toEqual(['projects', 'skills'])
      expect(data?.library.find((e) => e.type === 'projects')).toMatchObject({ title: 'Queue', tech: ['Go'], tags: ['Go'] })
      expect(data?.jobs).toHaveLength(1)
      expect(data?.jobs[0]).toMatchObject({ company: 'Acme', resume_config: { profile_text: 'mine' } })
      expect(data?.ai_calls).toHaveLength(1)
    })

    it('gives nothing of another user, and never the password or the ids of sessions', async () => {
      const text = JSON.stringify(await exportAccount(alice))
      expect(text).not.toContain('bob@example.test')
      expect(text).not.toContain('password')
      expect(text).not.toContain(`s-${alice}`)
      expect(text).not.toContain(`t-${alice}`)
    })

    it('is null for an account that does not exist', async () => {
      expect(await exportAccount('00000000-0000-0000-0000-000000000000')).toBeNull()
    })
  })

  describe('deleteAccount', () => {
    it('fills every table that holds a user, except the old ones the app no longer writes (so the test below proves something)', async () => {
      const before = await rowsOf(alice)
      // Tables of removed modules (#113 drops them): they still cascade, and nothing writes in them.
      const legacy = ['cover_letter_sentences', 'exercises', 'general_questions', 'knowledge', 'taxonomy']
      // A new table that names a user fails here until `fill` gives it a row.
      for (const [table, n] of Object.entries(before)) {
        if (!legacy.includes(table)) expect(n, `rows of alice in ${table}: add one to fill()`).toBeGreaterThan(0)
      }
    })

    it('removes every row of the user in every table, and the account', async () => {
      expect(await deleteAccount(alice)).toBe(true)
      const after = await rowsOf(alice)
      for (const [table, n] of Object.entries(after)) expect(n, `rows of alice left in ${table}`).toBe(0)
      const { rows } = await pool.query('SELECT 1 FROM users WHERE id = $1', [alice])
      expect(rows).toHaveLength(0)
    })

    it('removes the login attempts of the address and the creation counters of the user', async () => {
      await deleteAccount(alice)
      expect((await pool.query(`SELECT 1 FROM login_attempts WHERE email = 'alice@example.test'`)).rows).toHaveLength(0)
      expect((await pool.query('SELECT 1 FROM rate_limits WHERE key LIKE $1', [`%${alice}%`])).rows).toHaveLength(0)
    })

    it('removes the login attempts typed with other capitals too (the login does not lower-case the address)', async () => {
      await pool.query(`INSERT INTO login_attempts (email, count, reset_at) VALUES ('Alice@Example.test', 1, now() + interval '1 hour')`)
      await deleteAccount(alice)
      expect((await pool.query(`SELECT 1 FROM login_attempts WHERE lower(email) = 'alice@example.test'`)).rows).toHaveLength(0)
    })

    it('keeps the AI calls for the site\'s budget, without the user', async () => {
      await deleteAccount(alice)
      const { rows } = await pool.query('SELECT user_id FROM ai_usage ORDER BY id')
      expect(rows).toHaveLength(2)
      expect(rows.filter((r) => r.user_id === null)).toHaveLength(1)
      expect(rows.filter((r) => r.user_id === bob)).toHaveLength(1)
    })

    it('leaves another user untouched, in every table', async () => {
      const before = await rowsOf(bob)
      await deleteAccount(alice)
      expect(await rowsOf(bob)).toEqual(before)
      expect((await pool.query(`SELECT 1 FROM login_attempts WHERE email = 'bob@example.test'`)).rows).toHaveLength(1)
      expect((await pool.query('SELECT 1 FROM rate_limits WHERE key LIKE $1', [`%${bob}%`])).rows).toHaveLength(1)
    })

    it('says false for an account that does not exist, and changes nothing', async () => {
      expect(await deleteAccount('00000000-0000-0000-0000-000000000000')).toBe(false)
      expect((await pool.query('SELECT 1 FROM users')).rows).toHaveLength(2)
    })
  })
})
