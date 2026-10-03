import { cn } from '@/lib/cn'
import { focusRing, pressable, stroke } from './styles'

// A white sticker on the page: ink stroke and hard shadow; a clickable card moves onto it.
const base = cn(stroke, 'block bg-surface p-4 shadow-hard')
const interactiveClasses = cn(pressable, focusRing)

/** Card look, also for a link that is a card: `<Link className={cardClasses({ interactive: true })}>`. */
export function cardClasses({ interactive = false, className }: { interactive?: boolean; className?: string } = {}): string {
  return cn(base, interactive && interactiveClasses, className)
}

export function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cardClasses({ className })} {...props} />
}
