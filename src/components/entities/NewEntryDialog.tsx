'use client'

import { useEffect, useState } from 'react'
import type { EntityMeta, EntityType } from '@/types'
import { ResponsiveDialog } from '@/components/ui/ResponsiveDialog'
import { SegmentedTabs } from '@/components/ui/SegmentedTabs'
import { fetchJson } from '@/lib/http'
import { LIBRARY_TABS } from '@/lib/entity-filter'
import { EntityForm } from './EntityForm'
import { ENTITY_FIELDS, TYPE_SINGULAR } from './entity-fields'

interface Props {
  /** False while it slides out. */
  open: boolean
  /** The kind shown first (the one of the library behind). */
  initialType: EntityType
  onClose: () => void
  onCreated: (entity: EntityMeta) => void
}

/** The kind whose form is the tallest (the most fields): it sets the height of the dialog for every kind. */
const TALLEST = [...LIBRARY_TABS].sort((a, b) => ENTITY_FIELDS[b.value].length - ENTITY_FIELDS[a.value].length)[0].value

/**
 * A new library entry in a dialog (a drawer on a phone); the kind is chosen at the top of the form. The dialog has the
 * height of the tallest form whatever the kind, instead of growing and shrinking under the eyes when the kind changes:
 * an invisible copy of that form is measured (it takes no room itself) and the form of the chosen kind is given that
 * height at least, its buttons at the bottom. A form that grows past it (a long text) still grows the dialog.
 */
export function NewEntryDialog({ open, initialType, onClose, onCreated }: Props) {
  const [type, setType] = useState<EntityType>(initialType)
  const [saving, setSaving] = useState(false)
  // A state, not a ref object: the dialog draws its content a moment after this component, and the drawer only once open.
  const [sizer, setSizer] = useState<HTMLDivElement | null>(null)
  const [minHeight, setMinHeight] = useState(0)

  useEffect(() => {
    if (!sizer) return
    const observer = new ResizeObserver(() => setMinHeight(sizer.offsetHeight))
    observer.observe(sizer)
    return () => observer.disconnect()
  }, [sizer])

  async function handleSave(data: object) {
    setSaving(true)
    try {
      onCreated(await fetchJson<EntityMeta>('/api/entities', { method: 'POST', json: { type, ...data } }))
    } finally {
      setSaving(false)
    }
  }

  return (
    <ResponsiveDialog open={open} onClose={onClose} title={`New ${TYPE_SINGULAR[type].toLowerCase()}`}>
      <SegmentedTabs
        label="Kind of entry"
        variant="standalone"
        size="sm"
        items={LIBRARY_TABS.map((t) => ({ value: t.value, label: TYPE_SINGULAR[t.value] }))}
        value={type}
        onChange={setType}
      />
      <div className="relative">
        {/* Only room to measure: out of the flow, and nothing in it can be reached or read. */}
        <div ref={setSizer} aria-hidden="true" inert className="pointer-events-none invisible absolute inset-x-0 top-0">
          <EntityForm type={TALLEST} onSave={async () => {}} />
        </div>
        {/* Remounted on a new kind: each kind has its own fields. */}
        <div className="flex flex-col" style={{ minHeight }}>
          <EntityForm key={type} type={type} saving={saving} onSave={handleSave} onCancel={onClose} />
        </div>
      </div>
    </ResponsiveDialog>
  )
}
