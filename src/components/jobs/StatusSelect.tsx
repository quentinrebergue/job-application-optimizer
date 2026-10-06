'use client'

import type { ApplicationStatus } from '@/types'
import { APPLICATION_STATUSES, APPLICATION_STATUS_BADGES, APPLICATION_STATUS_LABELS } from '@/config'
import { cn } from '@/lib/cn'
import { badgeColors } from '@/components/ui/Badge'
import { SelectMenu, SelectMenuContent, SelectMenuItem, SelectMenuTrigger, SelectMenuValue } from '@/components/ui/SelectMenu'

const ITEMS = APPLICATION_STATUSES.map((s) => ({ value: s, label: APPLICATION_STATUS_LABELS[s] }))

interface Props {
  value: ApplicationStatus
  onChange: (status: ApplicationStatus) => void
  disabled?: boolean
}

/** The job's status as a button in its badge colours that opens the list of statuses. */
export function StatusSelect({ value, onChange, disabled }: Props) {
  return (
    <SelectMenu
      items={ITEMS}
      value={value}
      onValueChange={(next) => { if (next) onChange(next as ApplicationStatus) }}
      disabled={disabled}
    >
      <SelectMenuTrigger aria-label="Application status" className={cn('h-9 min-w-36', badgeColors[APPLICATION_STATUS_BADGES[value] ?? 'neutral'])}>
        <SelectMenuValue />
      </SelectMenuTrigger>
      <SelectMenuContent>
        {ITEMS.map((item) => (
          <SelectMenuItem key={item.value} value={item.value}>{item.label}</SelectMenuItem>
        ))}
      </SelectMenuContent>
    </SelectMenu>
  )
}
