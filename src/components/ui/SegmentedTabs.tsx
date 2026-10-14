'use client'

import { cn } from '@/lib/cn'
import type { TabItem } from './Tabs'

interface Props<T extends string> {
  /** Accessible name of the group */
  label: string
  items: TabItem<T>[]
  value: T
  onChange: (value: T) => void
  /**
   * `tab-bar`: the top edge of a card or of a full-width panel (only a bottom stroke).
   * `standalone`: a bordered bar with a hard shadow, on its own.
   */
  variant?: 'tab-bar' | 'standalone'
  /** `md` for page navigation, `sm` for a choice inside a form */
  size?: 'md' | 'sm'
  className?: string
}

const INNER = 'calc(var(--radius-control) - 2px)'

/**
 * Equal, joined segments; the selected one is filled red and semibold. The
 * state is announced (aria-pressed), not only shown by colour and weight.
 * A note follows the label in brackets: "Cover letter (Soon)".
 */
export function SegmentedTabs<T extends string>({ label, items, value, onChange, variant = 'tab-bar', size = 'md', className }: Props<T>) {
  const standalone = variant === 'standalone'

  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        'flex',
        standalone ? 'rounded-control border-2 border-ink shadow-hard' : 'border-b-2 border-ink',
        className,
      )}
    >
      {items.map((item, i) => {
        const selected = item.value === value
        const first = i === 0
        const last = i === items.length - 1
        return (
          <button
            key={item.value}
            type="button"
            aria-pressed={selected}
            disabled={item.disabled}
            onClick={() => onChange(item.value)}
            style={{
              borderTopLeftRadius: first ? INNER : undefined,
              borderBottomLeftRadius: first && standalone ? INNER : undefined,
              borderTopRightRadius: last ? INNER : undefined,
              borderBottomRightRadius: last && standalone ? INNER : undefined,
            }}
            className={cn(
              'flex flex-1 items-center justify-center px-2 leading-tight transition-colors',
              size === 'md' ? 'min-h-12 py-1 text-sm' : 'min-h-9 text-xs',
              'focus-visible:bg-warning focus-visible:text-ink focus-visible:outline-2 focus-visible:outline-transparent',
              !first && 'border-l-2 border-ink',
              selected ? 'bg-accent font-semibold text-ink' : 'bg-surface font-normal text-ink hover:bg-canvas',
              'disabled:cursor-not-allowed disabled:bg-line disabled:text-ink-muted disabled:hover:bg-line',
            )}
          >
            {/* One run of text: on one line where it fits, wrapping cleanly in a narrow segment. */}
            <span className="text-center">
              {item.label}
              {item.count !== undefined && <span className="tabular-nums"> {item.count}</span>}
              {item.note && <span className="font-normal"> ({item.note})</span>}
            </span>
          </button>
        )
      })}
    </div>
  )
}
