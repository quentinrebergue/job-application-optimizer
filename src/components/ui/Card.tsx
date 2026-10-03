import { cn } from '@/lib/cn'
import { focusRing } from './styles'

// Same colour as the page: a card is drawn by its hairline border, not a fill or a shadow.
const base = 'block rounded-control border border-line bg-canvas p-4'
const interactiveClasses = cn('transition-colors hover:border-ink-muted', focusRing)

/** Card look, also for a link that is a card: `<Link className={cardClasses({ interactive: true })}>`. */
export function cardClasses({ interactive = false, className }: { interactive?: boolean; className?: string } = {}): string {
  return cn(base, interactive && interactiveClasses, className)
}

export function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cardClasses({ className })} {...props} />
}
