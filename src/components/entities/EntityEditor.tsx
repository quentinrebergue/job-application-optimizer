'use client'

import { useEffect } from 'react'
import type { Entity, EntityMeta, EntityType } from '@/types'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { useFieldAutosave, type SaveState } from '@/hooks/useFieldAutosave'
import { fetchJson } from '@/lib/http'
import { EntityFields } from './EntityFields'
import { ENTITY_FIELDS, fieldUpdate, toValues } from './entity-fields'

interface Props {
  entity: Entity
  onSaved: (entity: EntityMeta) => void
  onDelete: () => void
  deleting: boolean
  /** The page header shows "Saving…" */
  onSaveStateChange?: (state: SaveState) => void
}

/** A library entry, always editable: each field saves itself (like the offer of a job). */
export function EntityEditor({ entity, onSaved, onDelete, deleting, onSaveStateChange }: Props) {
  const type = entity.type as EntityType
  const fields = ENTITY_FIELDS[type]
  const { values, errors, state, failure, edit } = useFieldAutosave({
    initial: toValues(type, entity),
    validate: (key, value) => {
      const field = fields.find((f) => f.key === key)
      return field?.required && !value.trim() ? `Enter the ${field.label.toLowerCase()}.` : undefined
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
      <div className="mt-2 flex justify-end">
        <Button variant="danger" size="sm" onClick={onDelete} disabled={deleting}>
          {deleting ? 'Deleting…' : 'Delete'}
        </Button>
      </div>
    </div>
  )
}
