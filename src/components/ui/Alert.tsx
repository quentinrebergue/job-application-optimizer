import { cn } from '@/lib/cn'

const variants = {
  danger: 'bg-danger text-white',
  success: 'bg-success text-ink',
  info: 'bg-info text-ink',
} as const

interface AlertProps extends React.ComponentProps<'div'> {
  variant?: keyof typeof variants
}

/** A message block. `danger` is announced immediately (role="alert"), the others politely. */
export function Alert({ variant = 'danger', className, ...props }: AlertProps) {
  return (
    <div
      role={variant === 'danger' ? 'alert' : 'status'}
      className={cn('rounded-control border-2 border-ink px-3 py-2 text-sm font-semibold', variants[variant], className)}
      {...props}
    />
  )
}
