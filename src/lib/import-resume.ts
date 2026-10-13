import { MAX_BODY_BYTES } from '@/config/limits'

// What the page that imports a resume needs apart from the screen (#268): the checks made before the PDF
// leaves the browser, the call to the API, and the sentences that say what happened. Pure and tested; the
// server checks everything again (the real type from the first bytes, the size, the limits).

export const IMPORT_MAX_BYTES = MAX_BODY_BYTES.resumePdf
export const IMPORT_MAX_MB = IMPORT_MAX_BYTES / (1024 * 1024)

export type Kind = 'experiences' | 'projects' | 'education' | 'skills'
export interface KindSummary {
  added: number
  /** Already in the library, not added again. */
  duplicates: number
  /** Left out because the library holds the most entries of that kind. */
  overCap: number
}
/** The answer of POST /api/import/resume. */
export interface ImportResult {
  summary: Record<Kind, KindSummary>
  dropped: number
  truncated: boolean
}

const KINDS: Kind[] = ['experiences', 'projects', 'education', 'skills']
const NOUN: Record<Kind, [one: string, many: string]> = {
  experiences: ['experience', 'experiences'],
  projects: ['project', 'projects'],
  education: ['degree', 'degrees'],
  skills: ['skill', 'skills'],
}
const count = (n: number, kind: Kind) => `${n} ${NOUN[kind][n === 1 ? 0 : 1]}`

/** What is wrong with the file, before sending it; null when it can go. The server looks at the real bytes again. */
export function checkFile(file: { name: string; type: string; size: number }): string | null {
  if (file.size === 0) return 'This file is empty.'
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) return 'Choose a PDF file.'
  if (file.size > IMPORT_MAX_BYTES) return `This PDF is too large: ${IMPORT_MAX_MB} MB at most.`
  return null
}

export interface Report {
  /** "Added 1 experience, 3 projects and 4 skills." or "Nothing new to add." */
  headline: string
  total: number
  /** What the user should know: what was not added and why. */
  notes: string[]
}

export function report(result: ImportResult): Report {
  const added = KINDS.filter((k) => result.summary[k].added > 0).map((k) => count(result.summary[k].added, k))
  const total = KINDS.reduce((sum, k) => sum + result.summary[k].added, 0)
  const headline =
    added.length === 0
      ? 'Nothing new to add.'
      : `Added ${added.length > 1 ? `${added.slice(0, -1).join(', ')} and ${added.at(-1)}` : added[0]}.`

  const notes: string[] = []
  const duplicates = KINDS.reduce((sum, k) => sum + result.summary[k].duplicates, 0)
  if (duplicates > 0) notes.push(`${duplicates} already in your library, not added again.`)
  for (const k of KINDS) {
    const over = result.summary[k].overCap
    if (over > 0) notes.push(`Your library is full for ${NOUN[k][1]}: ${over} not added. Delete some to make room.`)
  }
  // `dropped` (what the checks refused: an entry the text does not hold, a bullet taken for a job) is not said: it is
  // mostly noise of the model, the user cannot act on a count, and what really is missing is seen in the library.
  if (result.truncated) notes.push('Only the beginning of the PDF was read (the first 5 pages).')
  return { headline, total, notes }
}

/** What to tell the user about a failure. The API's own messages are written for them; the rest comes from the network in front of it. */
export function errorMessage(status: number, body: { error?: unknown } | null): string {
  if (status === 401) return 'Your session has expired. Sign in again.'
  if (typeof body?.error === 'string' && body.error !== '') return body.error
  if (status === 413) return `This PDF is too large (${IMPORT_MAX_MB} MB at most).`
  if (status === 429) return 'Too many tries. Try again later.'
  if (status === 502 || status === 503 || status === 504) return 'The import took too long or is unavailable. Try again in a moment.'
  return 'The import failed. Try again.'
}

export type SendOutcome = { ok: true; result: ImportResult } | { ok: false; message: string }

/** Sends the PDF as the body of the request and turns every outcome into something to show. */
export async function sendResume(file: Blob, options: { signal?: AbortSignal; fetchImpl?: typeof fetch } = {}): Promise<SendOutcome> {
  const doFetch = options.fetchImpl ?? fetch
  let res: Response
  try {
    res = await doFetch('/api/import/resume', {
      method: 'POST',
      headers: { 'content-type': 'application/pdf' },
      body: file,
      // Longer than the import takes (the Ingress waits 2 minutes): this only ends a call that never answers.
      signal: options.signal ?? AbortSignal.timeout(90_000),
    })
  } catch (error) {
    if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
      return { ok: false, message: 'The import took too long. Try again.' }
    }
    return { ok: false, message: 'The import could not be sent. Check your connection and try again.' }
  }
  const body = (await res.json().catch(() => null)) as (ImportResult & { error?: unknown }) | null
  if (!res.ok) return { ok: false, message: errorMessage(res.status, body) }
  if (!body?.summary) return { ok: false, message: 'The import answered something unexpected. Try again.' }
  return { ok: true, result: body }
}
