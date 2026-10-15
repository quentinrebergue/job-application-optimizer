'use client'

import { Check, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { eyebrow } from '@/components/ui/styles'

/** The title of a section of the import result. */
export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className={eyebrow}>{children}</h3>
}

/** What a card says when a field has nothing in it. */
export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-small text-ink-muted">{children}</p>
}

/** Edit, which becomes Done (in the accent colour) in the same place while the card is being edited. */
export function EditToggle({ editing, name, onToggle }: { editing: boolean; name: string; onToggle: () => void }) {
  return (
    <Button
      variant={editing ? 'primary' : 'secondary'}
      size="sm"
      onClick={onToggle}
      aria-label={editing ? `Done editing ${name}` : `Edit ${name}`}
      aria-pressed={editing}
      className="min-w-20"
    >
      {editing ? <Check size={14} aria-hidden="true" /> : <Pencil size={14} aria-hidden="true" />}
      {editing ? 'Done' : 'Edit'}
    </Button>
  )
}
