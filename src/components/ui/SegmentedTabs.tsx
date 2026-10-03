'use client'

import { cn } from '@/lib/cn'
import type { TabItem } from './Tabs'

interface Props<T extends string> {
  /** Accessible name of the group */
  label: string
  items: TabItem<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
}

/**
 * Equal, joined segments that form the top edge of a card: the selected one is
 * filled red. The state is announced (aria-pressed), not only shown by colour.
 */
export function SegmentedTabs<T extends string>({ label, items, value, onChange, className }: Props<T>) {
  return (
    <div role="group" aria-label={label} className={cn('flex border-b-2 border-ink', className)}>
      {items.map((item, i) => {
        const selected = item.value === value
        return (
          <button
            key={item.value}
            type="button"
            aria-pressed={selected}
            disabled={item.disabled}
            onClick={() => onChange(item.value)}
            className={cn(
              'flex min-h-12 flex-1 items-center justify-center gap-1.5 px-2 text-sm font-semibold transition-colors',
              'focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-ink',
              i > 0 && 'border-l-2 border-ink',
              i === 0 && 'rounded-tl-[calc(var(--radius-control)-2px)]',
              i === items.length - 1 && 'rounded-tr-[calc(var(--radius-control)-2px)]',
              selected ? 'bg-accent text-ink' : 'bg-surface text-ink hover:bg-canvas',
              'disabled:cursor-not-allowed disabled:text-ink-muted disabled:hover:bg-surface',
            )}
          >
            {item.label}
            {item.note && <span className="text-xs font-normal">· {item.note}</span>}
          </button>
        )
      })}
    </div>
  )
}
