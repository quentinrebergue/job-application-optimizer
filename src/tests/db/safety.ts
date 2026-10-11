// What keeps the tests that need Postgres from touching anything but their own schema (#221). Pure, so it has
// tests of its own (safety.test.ts): these are the guards between a wrong TEST_DATABASE_URL and real data.

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1'])

/**
 * Refuses a database that is not on this machine (or, in the CI, next to the job), unless
 * TEST_DATABASE_ALLOW_REMOTE=1. The tests create and drop a schema and empty its tables: pointed by mistake at
 * a database reached through `kubectl port-forward` or a copied production URL, that must not even start.
 */
export function checkTestDatabaseUrl(url: string, env: Record<string, string | undefined> = process.env): void {
  let host: string
  try {
    host = new URL(url).hostname.toLowerCase()
  } catch {
    throw new Error('TEST_DATABASE_URL is not a valid URL.')
  }
  if (LOCAL_HOSTS.has(host) || env.TEST_DATABASE_ALLOW_REMOTE === '1') return
  throw new Error(
    `TEST_DATABASE_URL points at "${host}", which is not this machine. The tests create and drop a schema and empty tables: ` +
      'use a throwaway local database, or set TEST_DATABASE_ALLOW_REMOTE=1 if you are sure.',
  )
}

const SCHEMA_NAME = /^vitest_(\d+)_(\d+)$/

/** The schemas of earlier runs that never cleaned up (a crash): the ones older than `maxAgeMs`, by the time in their name. */
export function staleSchemas(names: string[], now: number, maxAgeMs: number): string[] {
  return names.filter((name) => {
    const match = name.match(SCHEMA_NAME)
    return match !== null && now - Number(match[2]) > maxAgeMs
  })
}

/** A query function that is enough to ask where the connection is. */
export interface SchemaProbe {
  query: (sql: string) => Promise<{ rows: Array<{ schema: string }> }>
}

/**
 * Throws unless the connection is in the schema made for this run. Called before anything is emptied: if the
 * search path was not honoured (a connection pooler, a changed URL), the tables that would be emptied are the real ones.
 */
export async function assertTestSchema(pool: SchemaProbe, expected: string | undefined = process.env.DB_TEST_SCHEMA): Promise<void> {
  const { rows } = await pool.query('SELECT current_schema() AS schema')
  const schema = rows[0]?.schema
  if (!expected || !/^vitest_\d+_\d+$/.test(expected) || schema !== expected) {
    throw new Error(`Refusing to touch the database: the connection is in schema "${schema}", not in the test schema "${expected}".`)
  }
}
