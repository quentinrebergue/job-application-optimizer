import { describe, it, expect } from 'vitest'
import { assertTestSchema, checkTestDatabaseUrl, staleSchemas } from './safety'

describe('checkTestDatabaseUrl: a database that is not on this machine is refused', () => {
  it.each([
    'postgres://postgres:test@localhost:5432/postgres',
    'postgres://postgres:test@127.0.0.1:5434/postgres',
    'postgres://postgres:test@[::1]:5432/postgres',
    'postgres://app:x@LOCALHOST/job_optimizer',
  ])('accepts %s', (url) => {
    expect(() => checkTestDatabaseUrl(url, {})).not.toThrow()
  })

  it.each([
    'postgres://app:x@postgres.job-optimizer.svc:5432/job_optimizer',
    'postgres://app:x@10.0.3.4:5432/job_optimizer',
    'postgres://app:x@db.fastresume.tech/job_optimizer',
    'postgres://app:x@localhost.evil.test/job_optimizer',
  ])('refuses %s, and says why', (url) => {
    expect(() => checkTestDatabaseUrl(url, {})).toThrow(/not this machine/)
  })

  it('lets a remote database through only when told so in so many words', () => {
    const url = 'postgres://app:x@db.example.test/x'
    expect(() => checkTestDatabaseUrl(url, { TEST_DATABASE_ALLOW_REMOTE: '1' })).not.toThrow()
    expect(() => checkTestDatabaseUrl(url, { TEST_DATABASE_ALLOW_REMOTE: 'true' })).toThrow()
    expect(() => checkTestDatabaseUrl(url, { TEST_DATABASE_ALLOW_REMOTE: '' })).toThrow()
  })

  it('refuses what is not a URL', () => {
    expect(() => checkTestDatabaseUrl('not a url', {})).toThrow(/not a valid URL/)
  })
})

describe('staleSchemas: the leftovers of a run that crashed', () => {
  const HOUR = 3_600_000
  const NOW = 1_800_000_000_000
  it('picks the test schemas older than the limit, by the time in their name', () => {
    const names = [`vitest_100_${NOW - 3 * HOUR}`, `vitest_101_${NOW - 10 * 60_000}`, 'public', 'vitest_x', `vitest_102_${NOW - 2 * HOUR}`]
    expect(staleSchemas(names, NOW, HOUR)).toEqual([`vitest_100_${NOW - 3 * HOUR}`, `vitest_102_${NOW - 2 * HOUR}`])
  })

  it('never picks a schema that is not one of ours', () => {
    expect(staleSchemas(['public', 'app', 'vitest_data', 'my_vitest_1_2'], NOW, 0)).toEqual([])
  })
})

describe('assertTestSchema: nothing is emptied outside the schema of the run', () => {
  const probe = (schema: string) => ({ query: async () => ({ rows: [{ schema }] }) })

  it('lets the schema of the run through', async () => {
    await expect(assertTestSchema(probe('vitest_1_2'), 'vitest_1_2')).resolves.toBeUndefined()
  })

  it('refuses the public schema, which is where the real tables are', async () => {
    await expect(assertTestSchema(probe('public'), 'vitest_1_2')).rejects.toThrow(/Refusing to touch the database/)
  })

  it('refuses another test schema, and a run for which no schema was made', async () => {
    await expect(assertTestSchema(probe('vitest_9_9'), 'vitest_1_2')).rejects.toThrow()
    await expect(assertTestSchema(probe('vitest_1_2'), undefined)).rejects.toThrow()
  })

  it('refuses an expected schema that does not look like one of ours, even when the connection matches it', async () => {
    await expect(assertTestSchema(probe('public'), 'public')).rejects.toThrow()
  })
})
