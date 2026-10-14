'use client'

import type { EntityMeta } from '@/types'
import { Button } from '@/components/ui/Button'
import { entityLabel } from './logic'

interface Props {
  /** The included entries, in their resume order */
  items: EntityMeta[]
  onMove: (id: string, direction: 'up' | 'down') => void
}

/** Compact list to set the order of the included entries in the resume. */
export function ReorderList({ items, onMove }: Props) {
  return (
    <ol className="flex flex-col gap-2">
      {items.map((entity, i) => {
        const name = entityLabel(entity)
        return (
          <li key={entity.id} className="flex items-center gap-inline rounded-control border-2 border-ink bg-surface p-2 pl-row">
            <span className="text-small-strong w-5 shrink-0 tabular-nums text-ink-muted">{i + 1}</span>
            <span className="min-w-0 flex-1 truncate font-semibold">{name}</span>
            <Button variant="secondary" size="sm" aria-label={`Move ${name} up`} onClick={() => onMove(entity.id, 'up')} disabled={i === 0}>
              ↑ Up
            </Button>
            <Button variant="secondary" size="sm" aria-label={`Move ${name} down`} onClick={() => onMove(entity.id, 'down')} disabled={i === items.length - 1}>
              ↓ Down
            </Button>
          </li>
        )
      })}
    </ol>
  )
}
