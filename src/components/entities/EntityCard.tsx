'use client'

import type { EntityMeta } from '@/types'
import { Badge } from '@/components/ui/Badge'
import { cardClasses } from '@/components/ui/Card'
import { entityChips, entitySubtitle, entityTitle } from './entity-fields'

const MAX_TAGS = 3

interface Props {
  entity: EntityMeta
  /** Where the entry opens: the library with its dialog open. A new tab or a copied link goes there. */
  href: string
  /** A plain click opens the dialog without leaving the page. */
  onOpen: (entity: EntityMeta) => void
}

/** A library entry in a list (one kind at a time, so no kind badge): title (two lines at most), where/when, a few chips (a project's technologies). */
export function EntityCard({ entity, href, onOpen }: Props) {
  const title = entityTitle(entity)
  const subtitle = entitySubtitle(entity)
  const chips = entityChips(entity)
  const extra = chips.length - MAX_TAGS

  return (
    // A plain link (not next/link, which would fetch the page of every card as it scrolls into view).
    <a
      href={href}
      onClick={(e) => {
        // A click with a modifier, or not the main button, keeps its meaning (new tab, new window).
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
        e.preventDefault()
        onOpen(entity)
      }}
      className={cardClasses({ interactive: true, className: 'flex h-full flex-col gap-1' })}
    >
      <span title={title} className="text-item line-clamp-2">{title}</span>
      {subtitle && <p className="truncate text-small text-ink-muted">{subtitle}</p>}
      {chips.length > 0 && (
        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-2">
          {chips.slice(0, MAX_TAGS).map((chip) => <Badge key={chip} label={chip} variant="muted" />)}
          {extra > 0 && <span className="text-caption tabular-nums text-ink-muted">+{extra}</span>}
        </div>
      )}
    </a>
  )
}
