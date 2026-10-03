'use client'

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

/**
 * A filter over a list: from 640px a bar of joined segments with the counts; on
 * phones, where several segments do not fit, a menu.
 */
export function FilterBar<T extends string>({ label, options, value, onChange }: Props<T>) {
  const items = options.map((o) => ({ value: o.value, label: `${o.label} (${o.count})` }))

  return (
    <>
      <SegmentedTabs
        label={label}
        variant="standalone"
        className="hidden sm:flex"
        items={options.map((o) => ({ value: o.value, label: o.label, count: o.count }))}
        value={value}
        onChange={onChange}
      />
      <div className="sm:hidden">
        <SelectMenu items={items} value={value} onValueChange={(next) => { if (next) onChange(next as T) }}>
          <SelectMenuTrigger aria-label={label} className="w-full">
            <SelectMenuValue />
          </SelectMenuTrigger>
          <SelectMenuContent>
            {items.map((item) => <SelectMenuItem key={item.value} value={item.value}>{item.label}</SelectMenuItem>)}
          </SelectMenuContent>
        </SelectMenu>
      </div>
    </>
  )
}
