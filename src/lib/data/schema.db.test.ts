// The schema the migrations leave, against a real Postgres (#221). The global setup has already applied every
// migration, in order, on an empty schema: one that does not apply stops the run before any test. These tests
// say what the app counts on being there, so a migration that renames or drops it is found here and not in
// production.
import { it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import type { Pool } from 'pg'
import { dbDescribe, getPool, makeUser, resetData } from '@/tests/db/helpers'

let pool: Pool

/** The columns the app reads or writes, per table. */
const COLUMNS: Record<string, string[]> = {
  users: ['id', 'email', 'password_hash', 'created_at', 'email_verified_at'],
  sessions: ['id', 'user_id', 'expires_at', 'created_at'],
  jobs: ['id', 'user_id', 'company', 'title', 'description', 'location', 'url', 'status', 'date_added', 'tags', 'ats_tags', 'ai_analysis', 'resume_config'],
  entities: ['id', 'user_id', 'type', 'tags', 'latex_snippet', 'data'],
  user_resume_profile: ['user_id', 'full_name', 'email', 'linkedin', 'phone', 'address', 'resume_title', 'profile_text', 'ai_context', 'updated_at'],
  email_tokens: ['token_hash', 'user_id', 'purpose', 'expires_at', 'used_at', 'created_at', 'new_email'],
  login_attempts: ['email', 'count', 'reset_at'],
  rate_limits: ['key', 'count', 'reset_at'],
  ai_usage: ['id', 'user_id', 'feature', 'model', 'status', 'prompt_tokens', 'completion_tokens', 'cost_eur', 'created_at'],
  ai_usage_monthly: ['month', 'model', 'calls', 'prompt_tokens', 'completion_tokens', 'cost_eur'],
}

dbDescribe('the schema of the migrations', () => {
  beforeAll(async () => {
    pool = await getPool()
  })
  beforeEach(async () => {
    await resetData(pool)
  })
  afterAll(async () => {
    await pool.end()
  })

  it.each(Object.entries(COLUMNS))('has the columns the app uses in %s', async (table, columns) => {
    const { rows } = await pool.query<{ column_name: string }>(
      'SELECT column_name FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = $1',
      [table],
    )
    const present = rows.map((r) => r.column_name)
    expect(columns.filter((c) => !present.includes(c)), `missing in ${table}`).toEqual([])
  })

  it('no longer has the tables and columns of the removed modules (#113)', async () => {
    const { rows: tables } = await pool.query<{ tablename: string }>('SELECT tablename FROM pg_tables WHERE schemaname = current_schema()')
    for (const gone of ['taxonomy', 'general_questions', 'knowledge', 'exercises', 'cover_letter_sentences']) {
      expect(tables.map((t) => t.tablename), gone).not.toContain(gone)
    }
    const { rows: columns } = await pool.query<{ t: string }>(
      "SELECT table_name || '.' || column_name AS t FROM information_schema.columns WHERE table_schema = current_schema() AND table_name IN ('jobs', 'entities')",
    )
    for (const gone of ['jobs.questions', 'jobs.cover_letter', 'entities.questions']) expect(columns.map((c) => c.t), gone).not.toContain(gone)
  })

  it('ran in the schema of the test and nowhere else (the database is not touched)', async () => {
    const { rows } = await pool.query<{ schema: string }>('SELECT current_schema() AS schema')
    expect(rows[0].schema).toBe(process.env.DB_TEST_SCHEMA)
    expect(rows[0].schema).toMatch(/^vitest_/)
  })

  it('has one account per address: the same email twice is refused', async () => {
    await makeUser(pool, 'same@example.test')
    await expect(makeUser(pool, 'same@example.test')).rejects.toThrow(/unique|duplicate/i)
  })

  it('takes the sessions, the profile and the mail links of an account with it when it is deleted', async () => {
    const user = await makeUser(pool)
    await pool.query("INSERT INTO sessions (id, user_id, expires_at) VALUES ('s1', $1, now() + interval '1 day')", [user])
    await pool.query("INSERT INTO user_resume_profile (user_id, full_name) VALUES ($1, 'Ada')", [user])
    await pool.query("INSERT INTO email_tokens (token_hash, user_id, purpose, expires_at) VALUES ('h1', $1, 'verify', now() + interval '1 day')", [user])
    await pool.query('DELETE FROM users WHERE id = $1', [user])
    for (const table of ['sessions', 'user_resume_profile', 'email_tokens']) {
      const { rows } = await pool.query(`SELECT count(*)::int AS n FROM ${table}`)
      expect(rows[0].n, table).toBe(0)
    }
  })

  it('refuses a mail link of a purpose it does not know', async () => {
    const user = await makeUser(pool)
    await expect(
      pool.query("INSERT INTO email_tokens (token_hash, user_id, purpose, expires_at) VALUES ('h2', $1, 'surprise', now())", [user]),
    ).rejects.toThrow()
  })

  it('refuses a job, an entry or a session that belongs to nobody', async () => {
    await expect(
      pool.query("INSERT INTO jobs (id, user_id, company, title, description) VALUES ('job-x', '00000000-0000-0000-0000-000000000000', 'a', 'b', 'c')"),
    ).rejects.toThrow()
    await expect(
      pool.query("INSERT INTO sessions (id, user_id, expires_at) VALUES ('s2', '00000000-0000-0000-0000-000000000000', now())"),
    ).rejects.toThrow()
  })
})
