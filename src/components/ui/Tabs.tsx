'use client'

import { cn } from '@/lib/cn'
import { focusRing } from './styles'

export interface TabItem<T extends string> {
  value: T
  label: string
  /** Shown after the label, in the data font */
  count?: number
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
    <div role="group" aria-label={label} className={cn('flex flex-wrap gap-x-5 border-b border-line', className)}>
      {items.map((item) => {
        const selected = item.value === value
        return (
          <button
            key={item.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(item.value)}
            className={cn(
              '-mb-px border-b-2 py-2 text-sm transition-colors',
              focusRing,
              selected ? 'border-accent font-semibold text-ink' : 'border-transparent text-ink-muted hover:text-ink',
            )}
          >
            {item.label}
            {item.count !== undefined && (
              <span className="ml-1.5 font-mono text-xs font-normal text-ink-muted">{item.count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
