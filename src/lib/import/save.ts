import { createEntity, getResumeProfile, listEntities, saveResumeProfile } from '@/lib/data'
import { MAX_ENTRIES } from '@/config/limits'
import { IMPORT_TYPES, PROFILE_FIELDS, type ImportedEntries, type ImportedProfile } from '@/lib/ai/import-prompt'
import type { EntityMeta, EntityType } from '@/types'

// Puts the entries of an imported resume in the library (#267). An import adds, it never replaces or
// changes what is there: the user deletes what they do not want. Two things keep it from making a mess:
//  - an entry already in the library (the same title, company and period...) is not added again, so
//    importing the same resume twice changes nothing;
//  - the caps of the library (config/limits.ts) hold: once a kind is full, the rest of that kind is
//    left out, and said so.

export interface KindSummary {
  added: number
  /** Already in the library, not added again. */
  duplicates: number
  /** Left out because the library holds the most entries of that kind. */
  overCap: number
}
export type ImportSummary = Record<EntityType, KindSummary>

type Fields = Record<string, unknown>

/** What makes two entries of a kind the same one, ignoring case and spacing. */
const IDENTITY: Record<EntityType, string[]> = {
  experiences: ['title', 'company', 'period'],
  projects: ['title'],
  education: ['degree', 'institution', 'period'],
  skills: ['name', 'category'],
}

const keyOf = (type: EntityType, entry: Fields): string =>
  IDENTITY[type].map((field) => String(entry[field] ?? '').trim().toLowerCase().replace(/\s+/g, ' ')).join('|')

/** The counts, and the entries that were created (what the user is shown to check and fix, #281). */
export interface SavedImport {
  summary: ImportSummary
  created: EntityMeta[]
  /** The entries of the library the resume also holds (counted as duplicates): shown, so the user sees which. */
  existing: EntityMeta[]
}

export async function saveImportedEntries(userId: string, imported: ImportedEntries): Promise<SavedImport> {
  const summary = {} as ImportSummary
  const created: EntityMeta[] = []
  const existingMatches: EntityMeta[] = []
  for (const type of IMPORT_TYPES) {
    const existing = await listEntities(userId, type)
    const inLibrary = new Map(existing.map((entry) => [keyOf(type, entry as unknown as Fields), entry]))
    const known = new Set(inLibrary.keys())
    const shown = new Set<string>()
    let room = Math.max(0, MAX_ENTRIES[type] - existing.length)
    const kind: KindSummary = { added: 0, duplicates: 0, overCap: 0 }

    for (const entry of imported[type]) {
      const key = keyOf(type, entry as Fields)
      if (known.has(key)) {
        kind.duplicates++
        // Only once, and only an entry that was there before this import (not one created a line above).
        const match = inLibrary.get(key)
        if (match && !shown.has(key)) {
          shown.add(key)
          existingMatches.push(match)
        }
      } else if (room <= 0) {
        kind.overCap++
      } else {
        created.push(await createEntity(userId, type, entry as never))
        known.add(key)
        room--
        kind.added++
      }
    }
    summary[type] = kind
  }
  return { summary, created, existing: existingMatches }
}

const sameText = (a: string, b: string) => a.trim().toLowerCase().replace(/\s+/g, ' ') === b.trim().toLowerCase().replace(/\s+/g, ' ')

export interface SavedProfile {
  /** The fields that were empty and are now filled. */
  filled: string[]
  /** The fields the user already had, where the resume says something else: not written, shown (field -> what the resume says). */
  different: Record<string, string>
}

/**
 * Fills the resume profile with what the resume says of the person, only where the profile is empty: what the user
 * typed is never overwritten. Where the profile holds something else than the resume says, nothing is written and the
 * resume's value is returned, for the user to choose.
 */
export async function saveImportedProfile(userId: string, imported: ImportedProfile): Promise<SavedProfile> {
  const current = await getResumeProfile(userId)
  const filled = PROFILE_FIELDS.filter((field) => imported[field] && current[field].trim() === '')
  const different = Object.fromEntries(
    PROFILE_FIELDS.flatMap((field) => {
      const value = imported[field]
      return value && current[field].trim() !== '' && !sameText(current[field], value) ? [[field, value]] : []
    }),
  )
  if (filled.length > 0) {
    await saveResumeProfile(userId, { ...current, ...Object.fromEntries(filled.map((field) => [field, imported[field]])) })
  }
  return { filled, different }
}
