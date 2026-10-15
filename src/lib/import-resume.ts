import { MAX_BODY_BYTES } from '@/config/limits'
import type { EntityMeta } from '@/types'
import type { ResumeProfile } from '@/schemas/resume-profile'

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
  /** The entries this import created, to be checked and fixed in the dialog (#281). */
  entries: EntityMeta[]
  /** Entries of the library that the resume holds again (not added twice). */
  existing: EntityMeta[]
  /** The fields of the profile the import filled (only empty ones are). */
  profile?: string[]
  /** Fields where the profile holds something else than the resume says: field -> what the resume says. */
  profileFound?: Record<string, string>
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
const PROFILE_ORDER = ['full_name', 'email', 'phone', 'linkedin', 'address', 'resume_title', 'profile_text'] as const
type ProfileKey = (typeof PROFILE_ORDER)[number]
/** What a missing field is called in "No <noun> found" (the label with its capital, except for a name like LinkedIn). */
const PROFILE_NOUN: Record<ProfileKey, string> = {
  full_name: 'name', email: 'email', phone: 'phone', linkedin: 'LinkedIn', address: 'address', resume_title: 'resume title', profile_text: 'profile text',
}
const PROFILE_LABEL: Record<ProfileKey, string> = {
  full_name: 'Name', email: 'Email', phone: 'Phone', linkedin: 'LinkedIn', address: 'Address', resume_title: 'Resume title', profile_text: 'Profile',
}
/** The profile as lines to read, in the order of the form; a field left empty is null. */
export function profileRows(profile: ResumeProfile): { key: ProfileKey; label: string; missing: string; value: string | null }[] {
  return PROFILE_ORDER.map((field) => ({ key: field, label: PROFILE_LABEL[field], missing: `No ${PROFILE_NOUN[field]} found`, value: profile[field]?.trim() ? profile[field] : null }))
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

/** The entries created, one group per kind in the order of the library, empty kinds left out. */
export function groupByKind(entries: EntityMeta[]): { kind: Kind; entries: EntityMeta[] }[] {
  return KINDS.map((kind) => ({ kind, entries: entries.filter((e) => e.type === kind) })).filter((g) => g.entries.length > 0)
}

/** The heading of a group: "2 experiences". */
export const groupTitle = (kind: Kind, n: number) => count(n, kind)

/** The list after an entry was deleted. */
export const withoutEntry = (entries: EntityMeta[], id: string) => entries.filter((e) => e.id !== id)

/** The list after an entry was saved: the entry as the server last gave it replaces the one shown. */
export const withEntry = (entries: EntityMeta[], saved: EntityMeta) => entries.map((e) => (e.id === saved.id ? { ...e, ...saved } : e))

export function report(result: ImportResult): Report {
  const added = KINDS.filter((k) => result.summary[k].added > 0).map((k) => count(result.summary[k].added, k))
  const total = KINDS.reduce((sum, k) => sum + result.summary[k].added, 0)
  const headline =
    added.length === 0
      ? 'Nothing new to add.'
      : `Added ${added.length > 1 ? `${added.slice(0, -1).join(', ')} and ${added.at(-1)}` : added[0]}.`

  const notes: string[] = []
  for (const k of KINDS) {
    const over = result.summary[k].overCap
    if (over > 0) notes.push(`Your library is full for ${NOUN[k][1]}: ${over} not added. Delete some to make room.`)
  }
  // `dropped` (what the checks refused: an entry the text does not hold, a bullet taken for a job) is not said: it is
  // mostly noise of the model, the user cannot act on a count, and what really is missing is seen in the library.
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
