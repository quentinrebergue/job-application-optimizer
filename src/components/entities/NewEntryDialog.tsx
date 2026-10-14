'use client'

import { useState } from 'react'
import type { EntityMeta, EntityType } from '@/types'
import { ResponsiveDialog } from '@/components/ui/ResponsiveDialog'
import { SegmentedTabs } from '@/components/ui/SegmentedTabs'
import { fetchJson } from '@/lib/http'
import { LIBRARY_TABS } from '@/lib/entity-filter'
import { EntityForm } from './EntityForm'
import { TYPE_SINGULAR } from './entity-fields'

interface Props {
  /** The kind shown first (the one of the library behind). */
  initialType: EntityType
  onClose: () => void
  onCreated: (entity: EntityMeta) => void
}

/** A new library entry in a dialog (a drawer on a phone); the kind is chosen at the top of the form. */
export function NewEntryDialog({ initialType, onClose, onCreated }: Props) {
  const [type, setType] = useState<EntityType>(initialType)
  const [saving, setSaving] = useState(false)

  async function handleSave(data: object) {
    setSaving(true)
    try {
      onCreated(await fetchJson<EntityMeta>('/api/entities', { method: 'POST', json: { type, ...data } }))
    } finally {
      setSaving(false)
    }
  }

  return (
    <ResponsiveDialog open onClose={onClose} title={`New ${TYPE_SINGULAR[type].toLowerCase()}`}>
      <SegmentedTabs
        label="Kind of entry"
        variant="standalone"
        size="sm"
        items={LIBRARY_TABS.map((t) => ({ value: t.value, label: TYPE_SINGULAR[t.value] }))}
        value={type}
        onChange={setType}
      />
      {/* Remounted on a new kind: each kind has its own fields. */}
      <EntityForm key={type} type={type} saving={saving} onSave={handleSave} onCancel={onClose} />
    </ResponsiveDialog>
  )
}
