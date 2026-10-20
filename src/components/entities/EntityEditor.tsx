'use client'

import { useEffect, useState } from 'react'
import type { EntityMeta, EntityType } from '@/types'
import { Alert } from '@/components/ui/Alert'
import { useFieldAutosave, type SaveState } from '@/hooks/useFieldAutosave'
import { fetchJson } from '@/lib/http'
import { LIMITS } from '@/config/limits'
import { makeMain, nextVersionName, parseVariants, serializeVariants, variantsError, variantsOf } from '@/lib/description-variants'
import { DeleteButton } from './DeleteButton'
import { DescriptionVersions, MAIN_VERSION, versionIndex, versionKey } from './DescriptionVersions'
import { EntityFields } from './EntityFields'
import { ENTITY_FIELDS, entityTitle, fieldError, fieldUpdate, toValues } from './entity-fields'

const VERSIONS = 'descriptions'

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
  // The versions of a description (#297) are not one of the fields: they are kept as one string under this key.
  const hasVersions = type === 'experiences' || type === 'projects'
  const limit = type === 'experiences' ? LIMITS.experiences.description : LIMITS.projects.description
  const { values, errors, state, failure, edit } = useFieldAutosave({
    initial: { ...toValues(type, entity), ...(hasVersions ? { [VERSIONS]: serializeVariants(variantsOf(entity)) } : {}) } as Record<string, string>,
    validate: (key, value) => {
      if (key === VERSIONS) return variantsError(parseVariants(value), limit)
      const field = fields.find((f) => f.key === key)
      return field ? fieldError(field, value) : undefined
    },
    save: async (key, value) => {
      if (key === VERSIONS) {
        onSaved(await fetchJson<EntityMeta>(`/api/entities/${type}/${entity.id}`, { method: 'PUT', json: { descriptions: parseVariants(value) } }))
        return
      }
      const field = fields.find((f) => f.key === key)!
      onSaved(await fetchJson<EntityMeta>(`/api/entities/${type}/${entity.id}`, { method: 'PUT', json: fieldUpdate(field, value) }))
    },
  })

  // The version of the description on show (#297): the default one, or one of the others.
  const [active, setActive] = useState(MAIN_VERSION)
  const variants = parseVariants(values[VERSIONS] ?? '[]')
  const index = versionIndex(active, variants.length)
  const saveVariants = (list: typeof variants) => edit(VERSIONS, serializeVariants(list))

  useEffect(() => { onSaveStateChange?.(state) }, [state, onSaveStateChange])

  return (
    <div className="flex flex-col gap-field">
      {failure && <Alert>Not saved: {failure}</Alert>}
      <EntityFields
        type={type}
        values={values}
        errors={errors}
        onChange={edit}
        description={hasVersions ? {
          value: index === -1 ? values.description ?? '' : variants[index].text,
          onChange: (text) => (index === -1 ? edit('description', text) : saveVariants(variants.map((v, i) => (i === index ? { ...v, text } : v)))),
          header: (
            <DescriptionVersions
              variants={variants}
              active={active}
              error={errors[VERSIONS]}
              onSelect={setActive}
              // A new version starts as a copy of the default text: rewritten from there, not from nothing.
              onAdd={() => {
                saveVariants([...variants, { name: nextVersionName(variants), text: values.description ?? '' }])
                setActive(versionKey(variants.length))
              }}
              onRename={(name) => saveVariants(variants.map((v, i) => (i === index ? { ...v, name } : v)))}
              onMakeMain={() => {
                const next = makeMain(values.description ?? '', variants, index)
                edit('description', next.description)
                saveVariants(next.variants)
                setActive(MAIN_VERSION)
              }}
              onDelete={() => {
                saveVariants(variants.filter((_, i) => i !== index))
                setActive(MAIN_VERSION)
              }}
            />
          ),
        } : undefined}
      />
      {onDelete && (
        <div className="mt-actions flex justify-end">
          <DeleteButton name={entityTitle(entity) || 'this entry'} onConfirm={onDelete} busy={deleting} />
        </div>
      )}
    </div>
  )
}
