import { cn } from '@/lib/cn'
import { focusRing } from './styles'

interface IconButtonProps extends React.ComponentProps<'button'> {
  /** Required: an icon alone says nothing to a screen reader. */
  'aria-label': string
}

/** Small square button holding only an icon or a glyph. */
export function IconButton({ className, type = 'button', ...props }: IconButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex size-8 shrink-0 items-center justify-center rounded-control border-2 border-transparent text-ink transition-colors',
        'hover:border-ink disabled:pointer-events-none disabled:opacity-30',
        focusRing,
        className,
      )}
      {...props}
    />
  )
}
