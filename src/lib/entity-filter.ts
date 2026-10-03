import { ENTITY_TYPE_IDS } from '@/config'
import type { EntityType } from '@/types'

/** The library is always filtered by one kind; it opens on experiences. */
export const LIBRARY_TABS: { value: EntityType; label: string }[] = [
  { value: 'experiences', label: 'Experiences' },
  { value: 'projects', label: 'Projects' },
  { value: 'skills', label: 'Skills' },
  { value: 'education', label: 'Education' },
]

/** A kind of entry from the URL (?tab= or ?type=); undefined when unknown. */
export function parseEntityType(value: string | string[] | undefined): EntityType | undefined {
  return typeof value === 'string' && (ENTITY_TYPE_IDS as readonly string[]).includes(value) ? (value as EntityType) : undefined
}

/** The ?tab= of the library; anything unknown opens the experiences. */
export function parseLibraryTab(value: string | string[] | undefined): EntityType {
  return parseEntityType(value) ?? 'experiences'
}

/** Where the library shows one kind of entry. */
export function libraryHref(type: EntityType): string {
  return type === 'experiences' ? '/resume' : `/resume?tab=${type}`
}
