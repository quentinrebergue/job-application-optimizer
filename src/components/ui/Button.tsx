import { cn } from '@/lib/cn'
import { focusRing, pressable, stroke } from './styles'

const base = cn(
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap font-semibold',
  'disabled:pointer-events-none disabled:opacity-50',
  focusRing,
)

// Red is the main action, with ink text (white on red is below 4.5:1).
const variants = {
  primary: cn(stroke, pressable, 'bg-accent text-ink'),
  secondary: cn(stroke, pressable, 'bg-surface text-ink'),
  ghost: 'rounded-control border-2 border-transparent text-ink-muted hover:text-ink hover:underline underline-offset-4',
  danger: cn(stroke, pressable, 'bg-danger text-white'),
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
