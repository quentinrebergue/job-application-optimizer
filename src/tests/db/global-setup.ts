/**
 * Prepares a real Postgres for the `*.db.test.ts` files (#221).
 *
 * With TEST_DATABASE_URL set, it creates a schema of its own, applies the real migrations of
 * services/db-migrator/migrations in order (one transaction each, like the migrator), and points the app's
 * pool (DATABASE_URL) at that schema. When the run is over it drops the schema (and the ones an earlier crashed
 * run left, after an hour). Nothing else in the database is touched, so a development database can be used:
 * the tests only see their schema, and every helper checks that before it empties anything. A database that is
 * not on this machine is refused (see safety.ts). Without TEST_DATABASE_URL it does nothing and the tests skip.
 *
 * To run them locally against a throwaway Postgres:
 *   docker run --rm -d --name pgtest -p 5434:5432 -e POSTGRES_PASSWORD=test postgres:17-alpine
 *   TEST_DATABASE_URL=postgres://postgres:test@localhost:5434/postgres npm run test:db
 */

import fs from 'node:fs'
import path from 'node:path'
import { Client } from 'pg'
import { checkTestDatabaseUrl, staleSchemas } from './safety'

const MIGRATIONS = path.resolve(__dirname, '../../../services/db-migrator/migrations')

/** The same connection, with the schema first in the search path: every unqualified table is the test one. */
function withSchema(url: string, schema: string): string {
  const u = new URL(url)
  u.searchParams.set('options', `-c search_path=${schema}`)
  return u.toString()
}

export default async function setup() {
  const base = process.env.TEST_DATABASE_URL
  if (!base) {
    // On a laptop a missing database is a reason to skip. In the CI it is a mistake: a green run that
    // skipped the SQL tests would say nothing.
    if (process.env.CI) throw new Error('TEST_DATABASE_URL is not set in the CI: the tests that need Postgres would be skipped. Add the postgres service and the variable to the test job.')
    console.warn('db tests: TEST_DATABASE_URL is not set, the tests that need Postgres are skipped.')
    return
  }

  // Before anything is created: only a database on this machine (or next to the CI job).
  checkTestDatabaseUrl(base)

  const schema = `vitest_${process.pid}_${Date.now()}`
  const admin = new Client({ connectionString: base })
  await admin.connect()
  try {
    // The schemas of runs that crashed before they could clean up.
    const old = await admin.query<{ nspname: string }>("SELECT nspname FROM pg_namespace WHERE nspname ~ '^vitest_[0-9]+_[0-9]+$'")
    for (const name of staleSchemas(old.rows.map((r) => r.nspname), Date.now(), 60 * 60 * 1000)) {
      await admin.query(`DROP SCHEMA IF EXISTS ${name} CASCADE`)
    }
    await admin.query(`CREATE SCHEMA ${schema}`)
    await admin.query(`SET search_path TO ${schema}`)
    const files = fs.readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort()
    for (const file of files) {
      try {
        await admin.query('BEGIN')
        await admin.query(fs.readFileSync(path.join(MIGRATIONS, file), 'utf8'))
        await admin.query('COMMIT')
      } catch (error) {
        await admin.query('ROLLBACK')
        throw new Error(`migration ${file} does not apply on an empty database: ${(error as Error).message}`)
      }
    }
  } catch (error) {
    await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`).catch(() => {})
    await admin.end()
    throw error
  }
  await admin.end()

  // The test files read these; `@/lib/db` builds its pool from DATABASE_URL when it is first imported.
  process.env.DB_TEST_URL = withSchema(base, schema)
  process.env.DATABASE_URL = process.env.DB_TEST_URL
  process.env.DB_TEST_SCHEMA = schema

  return async function teardown() {
    const cleanup = new Client({ connectionString: base })
    await cleanup.connect()
    await cleanup.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`)
    await cleanup.end()
  }
}
