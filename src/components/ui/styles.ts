// Class strings shared by several primitives (neo-brutalism, see docs/design/identity.md).

/** The one page width (also the top bar's), centred on wide screens. */
export const pageWidth = 'mx-auto w-full max-w-7xl'

/** A page's container: the page width and its padding. */
export const page = 'mx-auto w-full max-w-7xl p-4 md:p-8'

/**
 * Visible keyboard focus, never shown on mouse click (#122): the control turns yellow and moves onto
 * its shadow, like a press. The transparent outline is for forced-colours modes, which drop fills.
 */
export const focusRing = [
  'focus-visible:outline-2 focus-visible:outline-transparent',
  'focus-visible:bg-warning focus-visible:text-ink',
  'focus-visible:translate-x-press focus-visible:translate-y-press focus-visible:shadow-none',
].join(' ')

/** The same for a link in running text or a footer: a yellow background, nothing moves. */
export const focusLink = 'focus-visible:bg-warning focus-visible:text-ink focus-visible:outline-2 focus-visible:outline-transparent'

/** Small capital label above a group ("STATUS", "DESCRIPTION"). */
export const eyebrow = 'text-xs font-semibold uppercase tracking-wider text-ink-muted'

/** 2px ink stroke and small radius: the outline of every sticker-like element. */
export const stroke = 'rounded-control border-2 border-ink'

/**
 * Hard shadow; on hover the element moves onto it. `hover:` only applies where
 * a pointer can hover, so on a phone the same press comes from `active:` (the
 * tap); after a hover, the click keeps it pressed without moving again.
 * Motion off with prefers-reduced-motion.
 */
export const pressable = [
  'shadow-hard transition-[translate,box-shadow] duration-100',
  'hover:translate-x-press hover:translate-y-press hover:shadow-none',
  'active:translate-x-press active:translate-y-press active:shadow-none',
  'motion-reduce:transition-none motion-reduce:hover:translate-x-0 motion-reduce:hover:translate-y-0',
  'motion-reduce:active:translate-x-0 motion-reduce:active:translate-y-0',
].join(' ')
