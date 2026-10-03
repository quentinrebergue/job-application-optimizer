// All magic values in one place. Never hardcode these elsewhere.

export const DEFAULT_QUESTION_COUNT = 20

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

/** Badge variant per status (see src/components/ui/Badge.tsx): in progress in red, closed ones muted. */
export const APPLICATION_STATUS_BADGES: Record<string, 'neutral' | 'muted' | 'accent' | 'success' | 'warning'> = {
  saved: 'neutral',
  applied: 'accent',
  interview: 'warning',
  offer: 'success',
  rejected: 'muted',
}

export const DIFFICULTY_LABELS: Record<string, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
}

export const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  hard: 'bg-red-100 text-red-700',
}
