'use client'

import type { ApplicationStatus } from '@/types'
import { APPLICATION_STATUSES, APPLICATION_STATUS_BADGES, APPLICATION_STATUS_LABELS } from '@/config'
import { cn } from '@/lib/cn'
import { focusRing } from '@/components/ui/styles'

// Same fills as the status badges.
const FILLS: Record<string, string> = {
  neutral: 'bg-surface text-ink',
  muted: 'bg-line text-ink',
  info: 'bg-info text-ink',
  success: 'bg-success text-ink',
  warning: 'bg-warning text-ink',
}

interface Props {
  value: ApplicationStatus
  onChange: (status: ApplicationStatus) => void
  disabled?: boolean
}

/** The job's status as a badge you can click to change. */
export function StatusSelect({ value, onChange, disabled }: Props) {
  return (
    <select
      aria-label="Application status"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as ApplicationStatus)}
      className={cn(
        'h-8 cursor-pointer rounded-control border-2 border-ink pl-2 pr-7 text-sm font-semibold shadow-hard disabled:opacity-60',
        FILLS[APPLICATION_STATUS_BADGES[value] ?? 'neutral'],
        focusRing,
      )}
    >
      {APPLICATION_STATUSES.map((s) => (
        <option key={s} value={s}>{APPLICATION_STATUS_LABELS[s]}</option>
      ))}
    </select>
  )
}
