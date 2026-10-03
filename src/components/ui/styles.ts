// Class strings shared by several primitives (neo-brutalism, see docs/design/identity.md).

/** Visible keyboard focus, never shown on mouse click. */
export const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-strong'

/** Small capital label above a group ("STATUS", "DESCRIPTION"). */
export const eyebrow = 'text-xs font-semibold uppercase tracking-wider text-ink-muted'

/** 2px ink stroke and small radius: the outline of every sticker-like element. */
export const stroke = 'rounded-control border-2 border-ink'

/** Hard shadow; on hover the element moves onto it. Motion off with prefers-reduced-motion. */
export const pressable =
  'shadow-hard transition-[translate,box-shadow] duration-100 hover:translate-x-press hover:translate-y-press hover:shadow-none motion-reduce:transition-none motion-reduce:hover:translate-x-0 motion-reduce:hover:translate-y-0'
