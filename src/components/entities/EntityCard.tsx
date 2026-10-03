'use client'

import Link from 'next/link'
import type { EntityMeta } from '@/types'
import { Badge } from '@/components/ui/Badge'
import { cardClasses } from '@/components/ui/Card'
import { entityChips, entitySubtitle, entityTitle } from './entity-fields'

const MAX_TAGS = 3

/** A library entry in a list (one kind at a time, so no kind badge): title (two lines at most), where/when, a few chips (a project's technologies). */
export function EntityCard({ entity }: { entity: EntityMeta }) {
  const title = entityTitle(entity)
  const subtitle = entitySubtitle(entity)
  const chips = entityChips(entity)
  const extra = chips.length - MAX_TAGS

  return (
    <Link href={`/entities/${entity.type}/${entity.id}`} className={cardClasses({ interactive: true, className: 'flex h-full flex-col gap-1' })}>
      <span title={title} className="line-clamp-2 font-extrabold leading-tight">{title}</span>
      {subtitle && <p className="truncate text-sm text-ink-muted">{subtitle}</p>}
      {chips.length > 0 && (
        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-2">
          {chips.slice(0, MAX_TAGS).map((chip) => <Badge key={chip} label={chip} variant="muted" />)}
          {extra > 0 && <span className="text-xs tabular-nums text-ink-muted">+{extra}</span>}
        </div>
      )}
    </Link>
  )
}
