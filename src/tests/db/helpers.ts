import { describe } from 'vitest'
import type { Pool } from 'pg'
import { assertTestSchema } from './safety'

/** True when a real Postgres is available: the global setup made a schema and set DB_TEST_URL. */
export const dbEnabled = Boolean(process.env.DB_TEST_URL)

/** `describe` for tests that need Postgres: skipped, not failed, when there is none. */
export const dbDescribe = dbEnabled ? describe : describe.skip

/** The app's own pool, pointed at the test schema by the global setup (and checked to be in it). */
export async function getPool(): Promise<Pool> {
  const pool = (await import('@/lib/db')).pool
  await assertTestSchema(pool)
  return pool
}

/**
 * Every table of the test schema, emptied (the tables and the migrations stay). The list is read from the
 * schema, so a table added by a migration is emptied without anyone remembering to add it here. Refuses to
 * run anywhere but in the schema of the run.
 */
export async function resetData(pool: Pool): Promise<void> {
  await assertTestSchema(pool)
  const { rows } = await pool.query<{ tablename: string }>('SELECT tablename FROM pg_tables WHERE schemaname = current_schema()')
  if (rows.length === 0) throw new Error('The test schema has no table: were the migrations applied?')
  await pool.query(`TRUNCATE ${rows.map((r) => `"${r.tablename}"`).join(', ')} RESTART IDENTITY CASCADE`)
}

/** A user row, for the tables that point at users. */
export async function makeUser(pool: Pool, email = `user-${Math.random().toString(36).slice(2)}@example.test`): Promise<string> {
  const { rows } = await pool.query<{ id: string }>('INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id', [email, 'hash'])
  return rows[0].id
}
