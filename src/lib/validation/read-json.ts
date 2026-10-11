import { NextResponse } from 'next/server'
import type { z } from 'zod'
import { MAX_BODY_BYTES } from '@/config/limits'

// Reads and checks the JSON body of a request (#201). Next.js does not cap the size of a
// body: `await request.json()` would read all of it, so a huge one is refused while it is
// read, before it is parsed.

type Result<T> = { ok: true; data: T } | { ok: false; response: NextResponse }

/** The body as text, or null once it goes over `maxBytes` (the rest is not read). */
async function readText(request: Request, maxBytes: number): Promise<string | null> {
  const declared = Number(request.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > maxBytes) return null
  if (!request.body) return ''
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > maxBytes) {
      await reader.cancel()
      return null
    }
    chunks.push(value)
  }
  return Buffer.concat(chunks).toString('utf8')
}

const label = (key: string) => (key === 'url' ? 'URL' : key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '))
const count = (n: number) => n.toLocaleString('en-US')

/** What the user reads for the first problem found: which field, and the limit. */
export function describeIssue(issue: z.core.$ZodIssue): string {
  const named = [...issue.path].reverse().find((part) => typeof part === 'string')
  const name = label(named === undefined ? 'value' : String(named))
  const inList = typeof issue.path.at(-1) === 'number'
  if (issue.code === 'too_big' && issue.origin === 'string') {
    return `${inList ? `An item of ${name}` : name} is too long: ${count(Number(issue.maximum))} characters at most.`
  }
  if (issue.code === 'too_big' && issue.origin === 'array') {
    return `${name} has too many items: ${count(Number(issue.maximum))} at most.`
  }
  if (issue.code === 'too_small' && issue.origin === 'string') return `${name} is required.`
  if (issue.code === 'invalid_type') return `${name} is missing or not valid.`
  return `${name} is not valid.`
}

/**
 * The validated body, or the response to send: 413 when it is too big, 400 when it is not
 * JSON or breaks a rule (with a message naming the field and its limit).
 */
export async function readJson<S extends z.ZodType>(
  request: Request,
  schema: S,
  maxBytes: number = MAX_BODY_BYTES.default,
): Promise<Result<z.output<S>>> {
  // An HTML form can only send these three types, not JSON: a body of one of them is never from our own
  // pages (which send application/json) and is how a page of another site would try to fake a JSON body (#206).
  const type = (request.headers.get('content-type') ?? '').toLowerCase()
  if (/^(application\/x-www-form-urlencoded|multipart\/form-data|text\/plain)/.test(type)) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Expected a JSON body.', code: 'unsupported_media_type' }, { status: 415 }),
    }
  }
  const raw = await readText(request, maxBytes)
  if (raw === null) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Your content is too large to save. Please shorten it.', code: 'body_too_large' },
        { status: 413 },
      ),
    }
  }
  let body: unknown
  try {
    body = JSON.parse(raw)
  } catch {
    return { ok: false, response: NextResponse.json({ error: 'Invalid request body' }, { status: 400 }) }
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: describeIssue(parsed.error.issues[0]), fields: Object.fromEntries(parsed.error.issues.map((i) => [i.path.join('.'), describeIssue(i)])) },
        { status: 400 },
      ),
    }
  }
  return { ok: true, data: parsed.data }
}
