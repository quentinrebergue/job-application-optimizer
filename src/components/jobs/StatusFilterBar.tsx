'use client'

import type { StatusFilter as Filter } from '@/lib/job-filter'
import { SegmentedTabs } from '@/components/ui/SegmentedTabs'
import { SelectMenu, SelectMenuContent, SelectMenuItem, SelectMenuTrigger, SelectMenuValue } from '@/components/ui/SelectMenu'

export interface FilterOption {
  value: Filter
  label: string
  count: number
}

interface Props {
  options: FilterOption[]
  value: Filter
  onChange: (value: Filter) => void
}

/**
 * Filter of the jobs list. From 640px a bar of joined segments with the counts;
 * on phones, where six segments do not fit, a menu.
 */
export function StatusFilterBar({ options, value, onChange }: Props) {
  const items = options.map((o) => ({ value: o.value, label: `${o.label} (${o.count})` }))

  return (
    <>
      <SegmentedTabs
        label="Filter by status"
        variant="standalone"
        className="hidden sm:flex"
        items={options.map((o) => ({ value: o.value, label: o.label, count: o.count }))}
        value={value}
        onChange={onChange}
      />
      <div className="sm:hidden">
        <SelectMenu items={items} value={value} onValueChange={(next) => { if (next) onChange(next as Filter) }}>
          <SelectMenuTrigger aria-label="Filter by status" className="w-full">
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
