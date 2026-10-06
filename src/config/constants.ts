// All magic values in one place. Never hardcode these elsewhere.

export const APPLICATION_STATUSES = [
  'saved',
  'applied',
  'interview',
  'offer',
  'rejected',
] as const

export const APPLICATION_STATUS_LABELS: Record<string, string> = {
  saved: 'Saved',
  applied: 'Applied',
  interview: 'Interview',
  offer: 'Offer',
  rejected: 'Rejected',
}

/** Badge variant per status (see src/components/ui/Badge.tsx): blue in progress, yellow needs attention, green done, closed ones muted. */
export const APPLICATION_STATUS_BADGES: Record<string, 'neutral' | 'muted' | 'info' | 'success' | 'warning'> = {
  saved: 'neutral',
  applied: 'info',
  interview: 'warning',
  offer: 'success',
  rejected: 'muted',
}
