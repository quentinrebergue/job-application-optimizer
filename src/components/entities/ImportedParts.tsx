'use client'

import { eyebrow } from '@/components/ui/styles'

/** A card of the import result. */
export const panelCard = 'flex flex-col gap-stack rounded-control border-2 border-ink bg-surface p-card'

/** The title of a section of the import result. */
export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className={eyebrow}>{children}</h3>
}

/** What a card says when a field has nothing in it. */
export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-small text-ink-muted">{children}</p>
}
