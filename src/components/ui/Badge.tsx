import { cn } from '@/lib/cn'

// Flat fills with ink text and an ink stroke. Colours describe a state, never a category.
/** Fill and text colour per variant, also used by controls that show a state (StatusSelect). */
export const badgeColors = {
  neutral: 'bg-surface text-ink',
  muted: 'bg-line text-ink',
  accent: 'bg-accent text-ink',
  info: 'bg-info text-ink',
  success: 'bg-success text-ink',
  warning: 'bg-warning text-ink',
  danger: 'bg-danger text-white',
} as const

export type BadgeVariant = keyof typeof badgeColors

interface BadgeProps extends React.ComponentProps<'span'> {
  label: string
  variant?: BadgeVariant
}

export function Badge({ label, variant = 'neutral', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-control border-2 border-ink px-2 py-0.5 text-xs font-semibold',
        badgeColors[variant],
        className,
      )}
      {...props}
    >
      {label}
    </span>
  )
}
