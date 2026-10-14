'use client'

import { useState } from 'react'
import type { EntityMeta, EntityType } from '@/types'
import { Alert } from '@/components/ui/Alert'
import { ResponsiveDialog } from '@/components/ui/ResponsiveDialog'
import { fetchJson } from '@/lib/http'
import type { SaveState } from '@/hooks/useFieldAutosave'
import { EntityEditor } from './EntityEditor'
import { TYPE_SINGULAR, entityTitle } from './entity-fields'

interface Props {
  /** False while it slides out: the entry stays drawn until the animation is over. */
  open: boolean
  entity: EntityMeta
  onClose: () => void
  /** Called with the entry as it was last saved, on every save. */
  onSaved: (entity: EntityMeta) => void
  onDeleted: (entity: EntityMeta) => void
}

/** A library entry in a dialog (a drawer on a phone): its fields, saved as you type, and its deletion. */
export function EntryDialog({ open, entity, onClose, onSaved, onDeleted }: Props) {
  const type = entity.type as EntityType
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<SaveState>('idle')

  async function handleDelete() {
    setDeleting(true)
    setError(null)
    try {
      await fetchJson(`/api/entities/${type}/${entity.id}`, { method: 'DELETE' })
      onDeleted(entity)
    } catch (err) {
      setError(`Entry not deleted: ${err instanceof Error ? err.message : 'try again.'}`)
      setDeleting(false)
    }
  }

  return (
    <ResponsiveDialog open={open} onClose={onClose} title={`${TYPE_SINGULAR[type]}: ${entityTitle(entity) || 'Untitled'}`}>
      <p aria-live="polite" className="-mt-2 text-xs text-ink-muted">{saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved' : ' '}</p>
      {error && <Alert>{error}</Alert>}
      <EntityEditor entity={entity} onSaved={onSaved} onDelete={handleDelete} deleting={deleting} onSaveStateChange={setSaveState} />
    </ResponsiveDialog>
  )
}
