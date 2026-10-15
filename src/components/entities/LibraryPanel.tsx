'use client'

import { useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus } from 'lucide-react'
import type { EntityMeta, EntityType } from '@/types'
import { FilterSegments, FilterSelect } from '@/components/ui/FilterBar'
import { SectionTitle } from '@/components/ui/SectionTitle'
import { focusRing, panelSection } from '@/components/ui/styles'
import { MAX_ENTRIES } from '@/config/limits'
import { getEntityTypeConfig } from '@/config'
import { cn } from '@/lib/cn'
import { LIBRARY_TABS, libraryHref, readLibraryState } from '@/lib/entity-filter'
import { EntityCard } from './EntityCard'
import { useHeld } from '@/hooks/useHeld'
import { EntryDialog } from './EntryDialog'
import { NewEntryDialog } from './NewEntryDialog'

/** A little longer than the slide of a drawer (300 ms). */
const SLIDE_OUT_MS = 400

const ADD_LABEL: Record<EntityType, string> = {
  experiences: 'Add an experience',
  projects: 'Add a project',
  skills: 'Add a skill',
  education: 'Add a degree',
}

interface Props {
  entities: EntityMeta[]
}

// The kind shown, the entry open and the entry being created are all in the address (?tab=, ?entry=, ?new=), changed with
// the History API: Next.js follows it (useSearchParams) without asking the server for the page again, so a click opens
// at once. The back button closes a dialog, and an address with ?entry= opens it.
const go = (href: string, how: 'push' | 'replace') =>
  how === 'push' ? window.history.pushState({ dialog: true }, '', href) : window.history.replaceState(null, '', href)

/** The library inside the Resume page: one kind at a time; an entry opens in a dialog, a new one is made in one. */
export function LibraryPanel({ entities }: Props) {
  const router = useRouter()
  const { tab, entry, creating } = readLibraryState(useSearchParams())

  // What changed in the dialogs, shown at once; the page is refreshed behind to bring the server's list back.
  const [added, setAdded] = useState<EntityMeta[]>([])
  const [edits, setEdits] = useState<Record<string, EntityMeta>>({})
  const [removed, setRemoved] = useState<ReadonlySet<string>>(new Set())

  const items = useMemo(() => {
    const known = new Set(entities.map((e) => e.id))
    return [...entities, ...added.filter((e) => !known.has(e.id))].filter((e) => !removed.has(e.id)).map((e) => edits[e.id] ?? e)
  }, [entities, added, edits, removed])

  const shown = items.filter((e) => e.type === tab)
  const max = MAX_ENTRIES[tab]
  const full = shown.length >= max
  const open = entry ? items.find((e) => e.id === entry) : undefined
  // A dialog stays drawn while it slides out, with what it showed.
  const heldEntry = useHeld(open, SLIDE_OUT_MS)
  const heldCreating = useHeld(open ? undefined : creating, SLIDE_OUT_MS)

  const openEntry = (e: EntityMeta) => go(libraryHref(tab, { entry: e.id }), 'push')
  const openNew = () => go(libraryHref(tab, { creating: tab }), 'push')
  // Closing goes back when the dialog was opened from this page (the history keeps one entry), else replaces the address.
  const close = () => (window.history.state?.dialog ? window.history.back() : go(libraryHref(tab), 'replace'))

  const filter = {
    label: 'Kind of entry',
    options: LIBRARY_TABS.map((t) => ({ ...t, count: items.filter((e) => e.type === t.value).length })),
    value: tab,
    onChange: (value: EntityType) => go(libraryHref(value), 'replace'),
  }

  return (
    <section aria-labelledby="library" className={cn(panelSection, 'flex flex-col gap-stack')}>
      {/* On a phone the menu of kinds sits beside the title; from 640 px the bar of segments is under it. */}
      <div className="flex items-center justify-between gap-inline">
        <SectionTitle id="library" level="page">Library</SectionTitle>
        <FilterSelect {...filter} className="w-48 max-w-[60%]" />
      </div>
      <FilterSegments {...filter} />

      {/* The first card adds an entry of the current kind; it also stands for an empty list. At the limit it says so. */}
      <div className="grid grid-cols-1 gap-stack sm:grid-cols-2 lg:grid-cols-3">
        {full ? (
          <div className="flex min-h-28 flex-col items-center justify-center gap-1 rounded-control border-2 border-dashed border-ink p-card text-center text-small text-ink-muted">
            <span className="font-semibold text-ink">{shown.length} / {max}</span>
            <span>
              You have reached the limit of {max} {getEntityTypeConfig(tab).label.toLowerCase()}. Delete one to add another.
            </span>
          </div>
        ) : (
          <a
            href={libraryHref(tab, { creating: tab })}
            onClick={(e) => {
              if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
              e.preventDefault()
              openNew()
            }}
            className={cn(
              'flex min-h-28 flex-col items-center justify-center gap-1 rounded-control border-2 border-dashed border-ink p-card font-semibold text-ink-muted',
              'transition-colors hover:bg-surface hover:text-ink',
              focusRing,
            )}
          >
            <span className="flex items-center gap-2">
              <Plus size={18} aria-hidden="true" />
              {ADD_LABEL[tab]}
            </span>
            <span className="text-caption font-normal">{shown.length} / {max}</span>
          </a>
        )}
        {shown.map((e) => <EntityCard key={e.id} entity={e} href={libraryHref(tab, { entry: e.id })} onOpen={openEntry} />)}
      </div>

      {heldEntry && (
        <EntryDialog
          key={heldEntry.id}
          open={!!open}
          entity={heldEntry}
          onClose={close}
          onSaved={(updated) => setEdits((prev) => ({ ...prev, [updated.id]: { ...(prev[updated.id] ?? heldEntry), ...updated } }))}
          onDeleted={(deleted) => {
            setRemoved((prev) => new Set(prev).add(deleted.id))
            go(libraryHref(tab), 'replace')
            router.refresh()
          }}
        />
      )}
      {!heldEntry && heldCreating && (
        <NewEntryDialog
          open={!!creating}
          initialType={heldCreating}
          onClose={close}
          onCreated={(created) => {
            setAdded((prev) => [...prev, created])
            // The new entry is shown on its own kind.
            go(libraryHref(created.type as EntityType), 'replace')
            router.refresh()
          }}
        />
      )}
    </section>
  )
}
