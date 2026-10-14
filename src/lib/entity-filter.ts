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

/** What the address of the library says: the kind shown, the entry open in its dialog, the kind being created. */
export interface LibraryState {
  tab: EntityType
  /** The id of the entry open in its dialog (?entry=). */
  entry?: string
  /** The kind of the entry being created in its dialog (?new=). */
  creating?: EntityType
}

type Params = { get(name: string): string | null }

/** The state of the library from its address; anything unknown is ignored. */
export function readLibraryState(params: Params): LibraryState {
  const entry = params.get('entry')
  return {
    tab: parseLibraryTab(params.get('tab') ?? undefined),
    entry: entry ? entry : undefined,
    creating: parseEntityType(params.get('new') ?? undefined),
  }
}

/**
 * The address of the library for a state: `/resume` on the experiences, `?tab=` on another kind, and `?entry=` or
 * `?new=` while a dialog is open. One dialog at a time: an entry wins over a creation.
 */
export function libraryHref(type: EntityType, dialog: { entry?: string; creating?: EntityType } = {}): string {
  const query = new URLSearchParams()
  if (type !== 'experiences') query.set('tab', type)
  if (dialog.entry) query.set('entry', dialog.entry)
  else if (dialog.creating) query.set('new', dialog.creating)
  const text = query.toString()
  return text ? `/resume?${text}` : '/resume'
}
