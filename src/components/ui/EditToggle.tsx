'use client'

import { Check, Pencil } from 'lucide-react'
import { Button } from './Button'

/** Edit, which becomes Done (in the accent colour) in the same place while what it edits is open. */
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
