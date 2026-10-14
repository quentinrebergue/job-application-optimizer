/**
 * How close an import is to what a person would have typed (the "truth" of a case), field by field. No AI, no file:
 * tested alone. Entries are paired with the expected ones by their words (title and company, degree and school),
 * the best pairs first, as a resume extractor is measured in research (an alignment, then the fields of each pair).
 */
import { normalize } from '@/lib/ai/import-prompt'

export const ENTRY_KINDS = ['experiences', 'projects', 'education'] as const
export type EntryKind = (typeof ENTRY_KINDS)[number]

/** A value to find: as written, or one of several, or a part of it; "optional" counts only when the import gives one. */
export type ValueSpec = string | { optional: string } | { any: string[] } | { contains: string }
type Entry = Record<string, unknown> & { optional?: boolean }

export interface Truth {
  profile?: Record<string, ValueSpec>
  experiences?: Entry[]
  projects?: Entry[]
  education?: Entry[]
  skills?: { min?: number; max?: number }
}

export interface Got {
  profile: Record<string, string | undefined>
  experiences: Record<string, unknown>[]
  projects: Record<string, unknown>[]
  education: Record<string, unknown>[]
  skills: unknown[]
}

export interface KindScore {
  expected: number
  found: number
  /** Entries the import gave that match nothing expected. */
  extra: number
  fieldsRight: number
  fields: number
  problems: string[]
}

export interface Score {
  kinds: Record<EntryKind, KindScore>
  profile: { right: number; total: number; problems: string[] }
  skills: { count: number; ok: boolean }
  /** Everything as expected. */
  perfect: boolean
}

/** What identifies an entry of each kind, to pair it with an expected one. */
const KEY: Record<EntryKind, string[]> = {
  experiences: ['title', 'company'],
  projects: ['title'],
  education: ['degree', 'institution'],
}

const words = (text: string) => new Set(normalize(text).split(' ').filter(Boolean))
const keyOf = (kind: EntryKind, e: Record<string, unknown>) => KEY[kind].map((k) => String(e[k] ?? '')).join(' ')

/**
 * How alike two entries are, from 0 to 1: the words in common over all their words (Jaccard), or over the words of
 * the shorter one when it is nearly all in the other ("Computer Engineering" in "Computer Engineering, Real time and
 * embedded systems"): a longer title for the same degree is still the same degree.
 */
export function likeness(a: string, b: string): number {
  const wa = words(a)
  const wb = words(b)
  if (wa.size === 0 || wb.size === 0) return 0
  let common = 0
  for (const w of wa) if (wb.has(w)) common++
  const jaccard = common / (wa.size + wb.size - common)
  const inShorter = common / Math.min(wa.size, wb.size)
  return inShorter >= 0.8 ? Math.max(jaccard, inShorter * 0.6) : jaccard
}

/** Two values are the same when one holds the other, without case, accents or punctuation. */
export function sameValue(got: string, want: string): boolean {
  const g = normalize(got)
  const w = normalize(want)
  if (w === '') return g === ''
  return g !== '' && (g === w || g.includes(w) || w.includes(g))
}

function matches(got: string | undefined, spec: ValueSpec): boolean | null {
  const value = got ?? ''
  if (typeof spec === 'string') return sameValue(value, spec)
  if ('optional' in spec) return value === '' ? null : sameValue(value, spec.optional)
  if ('any' in spec) return spec.any.some((v) => sameValue(value, v))
  return value !== '' && normalize(value).includes(normalize(spec.contains))
}

const PAIRED = 0.34

function scoreKind(kind: EntryKind, want: Entry[], got: Record<string, unknown>[]): KindScore {
  const score: KindScore = { expected: want.filter((w) => !w.optional).length, found: 0, extra: 0, fieldsRight: 0, fields: 0, problems: [] }
  const pairs: { w: number; g: number; like: number }[] = []
  want.forEach((w, wi) => got.forEach((g, gi) => {
    const like = likeness(keyOf(kind, g), keyOf(kind, w))
    if (like >= PAIRED) pairs.push({ w: wi, g: gi, like })
  }))
  pairs.sort((a, b) => b.like - a.like)
  const usedW = new Set<number>()
  const usedG = new Set<number>()
  for (const p of pairs) {
    if (usedW.has(p.w) || usedG.has(p.g)) continue
    usedW.add(p.w)
    usedG.add(p.g)
    const w = want[p.w]
    if (!w.optional) score.found++
    for (const [field, value] of Object.entries(w)) {
      if (field === 'optional' || typeof value !== 'string' || value === '') continue
      score.fields++
      if (sameValue(String(got[p.g][field] ?? ''), value)) score.fieldsRight++
      else score.problems.push(`${kind} "${keyOf(kind, w).trim()}": ${field} is "${String(got[p.g][field] ?? '')}", expected "${value}"`)
    }
  }
  want.forEach((w, wi) => { if (!usedW.has(wi) && !w.optional) score.problems.push(`${kind}: missing "${keyOf(kind, w).trim()}"`) })
  got.forEach((g, gi) => {
    if (!usedG.has(gi)) {
      score.extra++
      score.problems.push(`${kind}: not expected "${keyOf(kind, g).trim()}"`)
    }
  })
  return score
}

export function scoreImport(truth: Truth, got: Got): Score {
  const kinds = Object.fromEntries(ENTRY_KINDS.map((k) => [k, scoreKind(k, truth[k] ?? [], got[k])])) as Record<EntryKind, KindScore>

  const profile = { right: 0, total: 0, problems: [] as string[] }
  for (const [field, spec] of Object.entries(truth.profile ?? {})) {
    const ok = matches(got.profile[field], spec)
    if (ok === null) continue
    profile.total++
    if (ok) profile.right++
    else profile.problems.push(`profile: ${field} is "${got.profile[field] ?? ''}", expected ${JSON.stringify(spec)}`)
  }

  const count = got.skills.length
  const range = truth.skills ?? {}
  const skills = { count, ok: (range.min === undefined || count >= range.min) && (range.max === undefined || count <= range.max) }

  const perfect =
    ENTRY_KINDS.every((k) => kinds[k].found === kinds[k].expected && kinds[k].extra === 0 && kinds[k].fieldsRight === kinds[k].fields) &&
    profile.right === profile.total && skills.ok
  return { kinds, profile, skills, perfect }
}
