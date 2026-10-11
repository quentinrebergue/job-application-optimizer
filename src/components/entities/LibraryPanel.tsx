'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import type { EntityMeta, EntityType } from '@/types'
import { FilterBar } from '@/components/ui/FilterBar'
import { focusRing } from '@/components/ui/styles'
import { MAX_ENTRIES } from '@/config/limits'
import { getEntityTypeConfig } from '@/config'
import { cn } from '@/lib/cn'
import { LIBRARY_TABS, libraryHref } from '@/lib/entity-filter'
import { EntityCard } from './EntityCard'

const ADD_LABEL: Record<EntityType, string> = {
  experiences: 'Add an experience',
  projects: 'Add a project',
  skills: 'Add a skill',
  education: 'Add a degree',
}

interface Props {
  entities: EntityMeta[]
  initialTab: EntityType
}

/** The library inside the Resume page: one kind at a time (kept in ?tab=); the first card adds an entry of that kind. */
export function LibraryPanel({ entities, initialTab }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<EntityType>(initialTab)

  function changeTab(value: EntityType) {
    setTab(value)
    router.replace(libraryHref(value), { scroll: false })
  }

  const shown = entities.filter((e) => e.type === tab)
  const max = MAX_ENTRIES[tab]
  const full = shown.length >= max

  return (
    <div className="flex flex-col gap-4">
      <FilterBar
        label="Kind of entry"
        options={LIBRARY_TABS.map((t) => ({ ...t, count: entities.filter((e) => e.type === t.value).length }))}
        value={tab}
        onChange={changeTab}
      />

      {/* The first card adds an entry of the current kind; it also stands for an empty list. At the limit it says so. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {full ? (
          <div className="flex min-h-28 flex-col items-center justify-center gap-1 rounded-control border-2 border-dashed border-ink p-4 text-center text-sm text-ink-muted">
            <span className="font-semibold text-ink">{shown.length} / {max}</span>
            <span>
              You have reached the limit of {max} {getEntityTypeConfig(tab).label.toLowerCase()}. Delete one to add another.
            </span>
          </div>
        ) : (
          <Link
            href={`/entities/new?type=${tab}`}
            className={cn(
              'flex min-h-28 flex-col items-center justify-center gap-1 rounded-control border-2 border-dashed border-ink p-4 font-semibold text-ink-muted',
              'transition-colors hover:bg-surface hover:text-ink',
              focusRing,
            )}
          >
            <span className="flex items-center gap-2">
              <Plus size={18} aria-hidden="true" />
              {ADD_LABEL[tab]}
            </span>
            <span className="text-xs font-normal">{shown.length} / {max}</span>
          </Link>
        )}
        {shown.map((e) => <EntityCard key={e.id} entity={e} />)}
      </div>
    </div>
  )
}
