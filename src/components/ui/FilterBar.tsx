'use client'

import { cn } from '@/lib/cn'
import { SegmentedTabs } from './SegmentedTabs'
import { SelectMenu, SelectMenuContent, SelectMenuItem, SelectMenuTrigger, SelectMenuValue } from './SelectMenu'

export interface FilterOption<T extends string> {
  value: T
  label: string
  count: number
}

interface Props<T extends string> {
  /** Accessible name, e.g. "Filter by status" */
  label: string
  options: FilterOption<T>[]
  value: T
  onChange: (value: T) => void
}

/** A bar of joined segments with the counts, from 640px. */
export function FilterSegments<T extends string>({ label, options, value, onChange }: Props<T>) {
  return (
    <SegmentedTabs
      label={label}
      variant="standalone"
      className="hidden sm:flex"
      items={options.map((o) => ({ value: o.value, label: o.label, count: o.count }))}
      value={value}
      onChange={onChange}
    />
  )
}

/** A menu, on phones, where several segments do not fit. */
export function FilterSelect<T extends string>({ label, options, value, onChange, className }: Props<T> & { className?: string }) {
  const items = options.map((o) => ({ value: o.value, label: `${o.label} (${o.count})` }))
  return (
    <div className={cn('sm:hidden', className)}>
      <SelectMenu items={items} value={value} onValueChange={(next) => { if (next) onChange(next as T) }}>
        <SelectMenuTrigger aria-label={label} className="w-full">
          <SelectMenuValue />
        </SelectMenuTrigger>
        <SelectMenuContent>
          {items.map((item) => <SelectMenuItem key={item.value} value={item.value}>{item.label}</SelectMenuItem>)}
        </SelectMenuContent>
      </SelectMenu>
    </div>
  )
}

/**
 * A filter over a list: from 640px a bar of joined segments with the counts; on
 * phones, where several segments do not fit, a menu. A page that wants the menu elsewhere (beside a title)
 * uses the two parts itself.
 */
export function FilterBar<T extends string>(props: Props<T>) {
  return (
    <>
      <FilterSegments {...props} />
      <FilterSelect {...props} />
    </>
  )
}
