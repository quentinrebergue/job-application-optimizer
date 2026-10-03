import { cn } from '@/lib/cn'

// Variants carry a meaning; there is no colour per category.
const variants = {
  neutral: 'border-line bg-surface text-ink',
  muted: 'border-transparent bg-line/60 text-ink-muted',
  accent: 'border-accent/40 bg-accent/10 text-accent-strong',
  success: 'border-success/30 bg-success/10 text-success',
  warning: 'border-warning/30 bg-warning/10 text-warning',
  danger: 'border-danger/30 bg-danger/10 text-danger',
} as const

export type BadgeVariant = keyof typeof variants

interface BadgeProps extends React.ComponentProps<'span'> {
  label: string
  variant?: BadgeVariant
}

export function Badge({ label, variant = 'neutral', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-control border px-2 py-0.5 text-xs font-medium',
        variants[variant],
        className,
      )}
      {...props}
    >
      {label}
    </span>
  )
}
