import { createEntity, listEntities } from '@/lib/data'
import { MAX_ENTRIES } from '@/config/limits'
import { IMPORT_TYPES, type ImportedEntries } from '@/lib/ai/import-prompt'
import type { EntityType } from '@/types'

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

export async function saveImportedEntries(userId: string, imported: ImportedEntries): Promise<ImportSummary> {
  const summary = {} as ImportSummary
  for (const type of IMPORT_TYPES) {
    const existing = await listEntities(userId, type)
    const known = new Set(existing.map((entry) => keyOf(type, entry as unknown as Fields)))
    let room = Math.max(0, MAX_ENTRIES[type] - existing.length)
    const kind: KindSummary = { added: 0, duplicates: 0, overCap: 0 }

    for (const entry of imported[type]) {
      const key = keyOf(type, entry as Fields)
      if (known.has(key)) {
        kind.duplicates++
      } else if (room <= 0) {
        kind.overCap++
      } else {
        await createEntity(userId, type, entry as never)
        known.add(key)
        room--
        kind.added++
      }
    }
    summary[type] = kind
  }
  return summary
}
