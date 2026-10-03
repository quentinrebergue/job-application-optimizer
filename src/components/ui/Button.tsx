import { cn } from '@/lib/cn'
import { focusRing } from './styles'

const base = cn(
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-control font-medium transition-colors',
  'disabled:pointer-events-none disabled:opacity-50',
  focusRing,
)

const variants = {
  primary: 'bg-accent-strong text-white hover:bg-accent',
  secondary: 'border border-line bg-surface text-ink hover:border-ink-muted',
  ghost: 'text-ink-muted hover:bg-line/50 hover:text-ink',
  danger: 'bg-danger text-white hover:bg-danger/90',
} as const

const sizes = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
} as const

export type ButtonVariant = keyof typeof variants
export type ButtonSize = keyof typeof sizes

/** Button look, also for links that act as buttons: `<Link className={buttonClasses()}>`. */
export function buttonClasses({
  variant = 'primary',
  size = 'md',
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}): string {
  return cn(base, variants[variant], sizes[size], className)
}

interface ButtonProps extends React.ComponentProps<'button'> {
  variant?: ButtonVariant
  size?: ButtonSize
}

export function Button({ variant, size, className, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={buttonClasses({ variant, size, className })} {...props} />
}
