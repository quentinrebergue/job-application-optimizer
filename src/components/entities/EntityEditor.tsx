'use client'

import { useEffect } from 'react'
import type { EntityMeta, EntityType } from '@/types'
import { Alert } from '@/components/ui/Alert'
import { useFieldAutosave, type SaveState } from '@/hooks/useFieldAutosave'
import { fetchJson } from '@/lib/http'
import { DeleteButton } from './DeleteButton'
import { EntityFields } from './EntityFields'
import { ENTITY_FIELDS, entityTitle, fieldError, fieldUpdate, toValues } from './entity-fields'

interface Props {
  entity: EntityMeta
  onSaved: (entity: EntityMeta) => void
  /** Without it the editor has no Delete button (the caller has one of its own). */
  onDelete?: () => void
  deleting?: boolean
  /** The page header shows "Saving…" */
  onSaveStateChange?: (state: SaveState) => void
}

/** A library entry, always editable: each field saves itself (like the offer of a job). Deleting takes two presses of the same button. */
export function EntityEditor({ entity, onSaved, onDelete, deleting, onSaveStateChange }: Props) {
  const type = entity.type as EntityType
  const fields = ENTITY_FIELDS[type]
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
    <div className="flex flex-col gap-field">
      {failure && <Alert>Not saved: {failure}</Alert>}
      <EntityFields type={type} values={values} errors={errors} onChange={edit} />
      {onDelete && (
        <div className="mt-actions flex justify-end">
          <DeleteButton name={entityTitle(entity) || 'this entry'} onConfirm={onDelete} busy={deleting} />
        </div>
      )}
    </div>
  )
}
