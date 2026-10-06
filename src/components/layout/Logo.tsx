import { cn } from '@/lib/cn'

/**
 * The FastResume mark: an F whose stem ends in a lightning bolt, on a red
 * sticker with a hard shadow. Same drawing as docs/brand/logo.svg (the source
 * of the favicon), coloured with the tokens. Decorative: the name is next to it.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="2 2 56 56" aria-hidden="true" className={cn('shrink-0', className)}>
      <rect x="10" y="10" width="48" height="48" rx="5" className="fill-ink" />
      <rect x="4" y="4" width="48" height="48" rx="5" strokeWidth="4" className="fill-accent stroke-ink" />
      <path d="M21 8.5 H43 L41 15.5 H29 L27.5 21.5 H39 L37.3 28.5 L17 49.5 L21.6 32.5 H14.2 Z" className="fill-ink" />
    </svg>
  )
}
