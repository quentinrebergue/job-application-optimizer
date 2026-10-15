'use client'

import Link from 'next/link'
import { cn } from '@/lib/cn'
import type { TabItem } from './Tabs'

/**
 * A segment that does something instead of choosing a value, at the end of the bar: a link (Add job) or a button that
 * opens something (the search). It has the look of a segment; `accent` fills it like the selected one.
 */
export interface SegmentAction {
  key: string
  label?: string
  icon?: React.ReactNode
  /** The name of an icon-only action. */
  ariaLabel?: string
  href?: string
  onClick?: () => void
  /** Open, for a button that toggles something (announced with aria-expanded). */
  expanded?: boolean
  /** Controls this id. */
  controls?: string
  /** Filled like the selected segment. */
  accent?: boolean
}

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
  /** Segments after the choices, which act instead of choosing (standalone bars). */
  actions?: SegmentAction[]
  className?: string
}

const INNER = 'calc(var(--radius-control) - 2px)'

/**
 * Equal, joined segments; the selected one is filled red and semibold. The
 * state is announced (aria-pressed), not only shown by colour and weight.
 * A note follows the label in brackets: "Cover letter (Soon)".
 */
export function SegmentedTabs<T extends string>({ label, items, value, onChange, variant = 'tab-bar', size = 'md', actions = [], className }: Props<T>) {
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
        const last = i === items.length - 1 && actions.length === 0
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
              size === 'md' ? 'min-h-12 py-1 text-small' : 'min-h-9 text-caption',
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
      {actions.map((action, i) => {
        const last = i === actions.length - 1
        const classes = cn(
          'flex flex-1 items-center justify-center gap-2 border-l-2 border-ink px-2 leading-tight transition-colors',
          size === 'md' ? 'min-h-12 py-1 text-small' : 'min-h-9 text-caption',
          'focus-visible:bg-warning focus-visible:text-ink focus-visible:outline-2 focus-visible:outline-transparent',
          // An action is not a choice: light beige (the tint of panels) at rest, filled like a selected segment when it is open or `accent`.
          action.accent || action.expanded ? 'bg-accent font-semibold text-ink' : 'bg-panel font-normal text-ink hover:bg-canvas',
        )
        const style = { borderTopRightRadius: last ? INNER : undefined, borderBottomRightRadius: last && standalone ? INNER : undefined }
        const content = <>{action.icon}{action.label && <span>{action.label}</span>}</>
        return action.href ? (
          <Link key={action.key} href={action.href} aria-label={action.ariaLabel} style={style} className={classes}>{content}</Link>
        ) : (
          <button
            key={action.key}
            type="button"
            aria-label={action.ariaLabel}
            aria-expanded={action.expanded}
            aria-controls={action.controls}
            onClick={action.onClick}
            style={style}
            className={classes}
          >
            {content}
          </button>
        )
      })}
    </div>
  )
}
