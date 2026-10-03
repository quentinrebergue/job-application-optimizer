'use client'

import { cn } from '@/lib/cn'
import { focusRing } from './styles'

export interface TabItem<T extends string> {
  value: T
  label: string
  /** Shown after the label, in tabular figures */
  count?: number
  /** Greyed out and not selectable, e.g. a feature that is not ready */
  disabled?: boolean
  /** Short note after the label, e.g. "Soon" */
  note?: string
}

interface TabsProps<T extends string> {
  /** Accessible name of the group, e.g. "Filter by status" */
  label: string
  items: TabItem<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
}

/**
 * A row of mutually exclusive filters. Each one is a toggle button whose state is
 * announced (`aria-pressed`), not only shown by colour.
 */
export function Tabs<T extends string>({ label, items, value, onChange, className }: TabsProps<T>) {
  return (
    <div role="group" aria-label={label} className={cn('flex flex-wrap gap-2', className)}>
      {items.map((item) => {
        const selected = item.value === value
        return (
          <button
            key={item.value}
            type="button"
            aria-pressed={selected}
            disabled={item.disabled}
            onClick={() => onChange(item.value)}
            className={cn(
              'rounded-control border-2 px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-transparent',
              focusRing,
              selected
                ? 'border-ink bg-surface font-semibold text-ink shadow-hard'
                : 'border-transparent text-ink-muted hover:border-ink hover:text-ink',
            )}
          >
            {item.label}
            {item.count !== undefined && (
              <span className="ml-1.5 text-xs font-normal tabular-nums">{item.count}</span>
            )}
            {item.note && <span className="ml-1.5 text-xs font-normal">· {item.note}</span>}
          </button>
        )
      })}
    </div>
  )
}
