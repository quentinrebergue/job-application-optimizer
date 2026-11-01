import fs from 'node:fs'
import path from 'node:path'
import { describe, it, expect } from 'vitest'

// Every API route that reads a body goes through a schema (a shape and a size for every field, #201 and #207). The scan
// reads the routes: it cannot see that a schema is the right one, but it fails on a route that reads a body with none.

const API = path.resolve(process.cwd(), 'src/app/api')

function routes(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return routes(full)
    return entry.name === 'route.ts' ? [full] : []
  })
}

/** Reads what the client sent as JSON, text or a form. */
const READS_A_BODY = /\.(json|text|formData)\(\)|readJson\(/
/** Parses it with a schema. */
const HAS_A_SCHEMA = /readJson\(|\.safeParse\(|\.parse\(/

/** Routes whose body is not JSON: the PDF of the import is checked by its size and its first bytes. */
const OTHER_BODIES = new Set(['import/resume/route.ts'])

describe('the API routes that read a body', () => {
  const files = routes(API).map((file) => ({ file, name: path.relative(API, file), source: fs.readFileSync(file, 'utf8') }))

  it('finds the routes of the app', () => {
    expect(files.length).toBeGreaterThan(10)
  })

  it.each(files.filter((f) => READS_A_BODY.test(f.source)))('$name validates it with a schema', ({ name, source }) => {
    if (OTHER_BODIES.has(name)) return
    expect(HAS_A_SCHEMA.test(source), `${name} reads a body without a schema`).toBe(true)
  })

  it('has no route that answers the text of an unexpected error', () => {
    const leaking = files.filter((f) => /error: error instanceof Error \? error\.message/.test(f.source)).map((f) => f.name)
    expect(leaking, 'these routes answer error.message of any error').toEqual([])
  })
})
