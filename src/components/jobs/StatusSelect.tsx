'use client'

import type { ApplicationStatus } from '@/types'
import { APPLICATION_STATUSES, APPLICATION_STATUS_BADGES, APPLICATION_STATUS_LABELS } from '@/config'
import { SelectMenu, SelectMenuContent, SelectMenuItem, SelectMenuTrigger, SelectMenuValue } from '@/components/ui/SelectMenu'

// Same fills as the status badges.
const FILLS: Record<string, string> = {
  neutral: 'bg-surface',
  muted: 'bg-line',
  info: 'bg-info',
  success: 'bg-success',
  warning: 'bg-warning',
}

const ITEMS = APPLICATION_STATUSES.map((s) => ({ value: s, label: APPLICATION_STATUS_LABELS[s] }))

interface Props {
  value: ApplicationStatus
  onChange: (status: ApplicationStatus) => void
  disabled?: boolean
}

/** The job's status as a badge-coloured button that opens the list of statuses. */
export function StatusSelect({ value, onChange, disabled }: Props) {
  return (
    <SelectMenu
      items={ITEMS}
      value={value}
      onValueChange={(next) => { if (next) onChange(next as ApplicationStatus) }}
      disabled={disabled}
    >
      <SelectMenuTrigger aria-label="Application status" className={`h-9 min-w-36 ${FILLS[APPLICATION_STATUS_BADGES[value] ?? 'neutral']}`}>
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
