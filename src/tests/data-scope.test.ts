/**
 * data-scope.test.ts
 *
 * The property that matters most: a user never reads or changes another user's data (#220).
 * Every query on the tables that hold what a user writes (jobs, entities, the resume profile) must
 * filter or write by `user_id`, and must live in the data layer (src/lib/data), the one place that
 * knows the rule. A query added elsewhere, or without the condition, fails here before it ships.
 *
 * The scan reads the SQL strings of every `.query(...)` call in src/. It is a guard, not a proof:
 * it cannot see a condition that is present but wrong. Tests of the routes check the rest.
 */

import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

const ROOT = path.resolve(__dirname, '../../')
const SRC = path.join(ROOT, 'src')

/** What a user writes: scoped by user_id, only through the data layer. */
const USER_DATA_TABLES = ['jobs', 'entities', 'user_resume_profile']
const DATA_LAYER = 'src/lib/data/'

/**
 * Tables that hold something else, with why a query on them is not scoped by `user_id`: keyed by the
 * secret that proves who is asking (a session id, a token hash), by an address, or accounting rows.
 */
const OTHER_TABLES: Record<string, string> = {
  users: 'looked up by id or email, never lists users, the id comes from the session',
  sessions: 'keyed by the secret session id; deleting all of a user is by user_id',
  email_tokens: 'keyed by the hash of the secret token in the mail link',
  rate_limits: 'keyed by a string that names the visitor or the address',
  login_attempts: 'keyed by the email being tried',
  ai_usage: 'accounting rows of the site, written and settled by id',
}

function sourceFiles(dir: string, files: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) sourceFiles(full, files)
    else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) && !entry.name.endsWith('.d.ts')) files.push(full)
  }
  return files
}

interface Query {
  file: string
  sql: string
  tables: string[]
}

const QUERY_CALL = /\.query(?:<[^>]*>)?\(\s*(`[^`]*`|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")/g
// `do update set` (an upsert) is not a table
const TABLE_REF = /\b(?:from|into|update|join)\s+(?!set\b)([a-z_]+)/g

function queries(): Query[] {
  const found: Query[] = []
  for (const full of sourceFiles(SRC)) {
    const file = path.relative(ROOT, full)
    const text = fs.readFileSync(full, 'utf8')
    for (const match of text.matchAll(QUERY_CALL)) {
      const sql = match[1].slice(1, -1).replace(/\s+/g, ' ').trim().toLowerCase()
      found.push({ file, sql, tables: [...sql.matchAll(TABLE_REF)].map((m) => m[1]) })
    }
  }
  return found
}

const all = queries()
const onUserData = all.filter((q) => q.tables.some((t) => USER_DATA_TABLES.includes(t)))

describe('data scope: the scan itself', () => {
  it('finds the queries of the app (a scan that finds nothing proves nothing)', () => {
    expect(all.length).toBeGreaterThan(30)
    for (const table of USER_DATA_TABLES) {
      expect(onUserData.filter((q) => q.tables.includes(table)).length, `queries on ${table}`).toBeGreaterThanOrEqual(2)
    }
  })

  it('knows every table the app queries, so a new table has to be classified', () => {
    const known = new Set([...USER_DATA_TABLES, ...Object.keys(OTHER_TABLES)])
    const unknown = [...new Set(all.flatMap((q) => q.tables))].filter((t) => !known.has(t))
    expect(unknown, `tables not classified in data-scope.test.ts: ${unknown.join(', ')}`).toEqual([])
  })
})

describe('data scope: what a user writes', () => {
  it('is queried only from the data layer', () => {
    const outside = onUserData.filter((q) => !q.file.startsWith(DATA_LAYER)).map((q) => `${q.file}: ${q.sql.slice(0, 70)}`)
    expect(outside, 'a query on jobs, entities or the profile outside src/lib/data').toEqual([])
  })

  it('is always filtered or written by user_id', () => {
    const unscoped = onUserData.filter((q) => !q.sql.includes('user_id')).map((q) => `${q.file}: ${q.sql.slice(0, 90)}`)
    expect(unscoped, 'a query on user data with no user_id').toEqual([])
  })

  it('has user_id in the WHERE of every read, update and delete, not only somewhere in the text', () => {
    const bad = onUserData
      .filter((q) => /^(select|update|delete)/.test(q.sql))
      .filter((q) => !/where[^;]*\buser_id\b/.test(q.sql))
      .map((q) => `${q.file}: ${q.sql.slice(0, 90)}`)
    expect(bad, 'a read, update or delete on user data without user_id in its WHERE').toEqual([])
  })
})

describe('data scope: the other tables', () => {
  it('have a reason written here for not being scoped by user_id', () => {
    for (const [table, why] of Object.entries(OTHER_TABLES)) expect(why.length, table).toBeGreaterThan(10)
  })
})
