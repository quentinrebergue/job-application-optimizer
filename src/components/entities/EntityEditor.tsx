'use client'

import { useEffect, useRef, useState } from 'react'
import type { EntityMeta, EntityType } from '@/types'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { useFieldAutosave, type SaveState } from '@/hooks/useFieldAutosave'
import { fetchJson } from '@/lib/http'
import { EntityFields } from './EntityFields'
import { ENTITY_FIELDS, fieldError, fieldUpdate, toValues } from './entity-fields'

interface Props {
  entity: EntityMeta
  onSaved: (entity: EntityMeta) => void
  onDelete: () => void
  deleting: boolean
  /** The page header shows "Saving…" */
  onSaveStateChange?: (state: SaveState) => void
}

/** A library entry, always editable: each field saves itself (like the offer of a job). Deleting asks first, in place. */
export function EntityEditor({ entity, onSaved, onDelete, deleting, onSaveStateChange }: Props) {
  const type = entity.type as EntityType
  const fields = ENTITY_FIELDS[type]
  const [confirming, setConfirming] = useState(false)
  const confirmRef = useRef<HTMLDivElement>(null)
  // In a drawer on a phone the question appears below the fields, off the screen: bring it into view.
  useEffect(() => { if (confirming) confirmRef.current?.scrollIntoView({ block: 'nearest' }) }, [confirming])
  const { values, errors, state, failure, edit } = useFieldAutosave({
    initial: toValues(type, entity),
    validate: (key, value) => {
      const field = fields.find((f) => f.key === key)
      return field ? fieldError(field, value) : undefined
    },
    save: async (key, value) => {
      const field = fields.find((f) => f.key === key)!
      onSaved(await fetchJson<EntityMeta>(`/api/entities/${type}/${entity.id}`, { method: 'PUT', json: fieldUpdate(field, value) }))
    },
  })

  useEffect(() => { onSaveStateChange?.(state) }, [state, onSaveStateChange])

  return (
    <div className="flex flex-col gap-4">
      {failure && <Alert>Not saved: {failure}</Alert>}
      <EntityFields type={type} values={values} errors={errors} onChange={edit} />
      {/* Confirmed here, not in a drawer on top: a dialog hides the page behind it, drawers included. */}
      {confirming ? (
        <div ref={confirmRef} role="alert" className="mt-2 flex flex-col gap-3 rounded-control border-2 border-ink bg-surface p-3 text-sm">
          <p className="font-semibold">Delete this entry?</p>
          <p className="text-ink-muted">It is removed from your library and from the resumes of your jobs. This cannot be undone.</p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" size="sm" onClick={() => setConfirming(false)}>Cancel</Button>
            <Button variant="danger" size="sm" onClick={() => { setConfirming(false); onDelete() }} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-2 flex justify-end">
          <Button variant="danger" size="sm" onClick={() => setConfirming(true)} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      )}
    </div>
  )
}
