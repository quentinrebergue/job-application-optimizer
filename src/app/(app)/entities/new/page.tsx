'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { EntityType } from '@/types'
import { PageHeader } from '@/components/ui/PageHeader'
import { SegmentedTabs } from '@/components/ui/SegmentedTabs'
import { EntityForm } from '@/components/entities/EntityForm'
import { TYPE_SINGULAR } from '@/components/entities/entity-fields'
import { fetchJson } from '@/lib/http'
import { LIBRARY_TABS, libraryHref, parseLibraryTab } from '@/lib/entity-filter'
import { page } from '@/components/ui/styles'

/** A new library entry; the kind is chosen at the top of the form (preset from where you came from). */
function NewEntity() {
  const router = useRouter()
  const [type, setType] = useState<EntityType>(parseLibraryTab(useSearchParams().get('type') ?? undefined))
  const [saving, setSaving] = useState(false)

  async function handleSave(data: object) {
    setSaving(true)
    try {
      const entity = await fetchJson<{ id: string; type: string }>('/api/entities', { method: 'POST', json: { type, ...data } })
      router.push(`/entities/${entity.type}/${entity.id}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={page}>
      <PageHeader title={`New ${TYPE_SINGULAR[type].toLowerCase()}`} subtitle="Add it to your library; every resume can use it." />
      <div className="flex flex-col gap-6 rounded-control border-2 border-ink bg-panel p-4 shadow-hard md:p-6">
        <SegmentedTabs
          label="Kind of entry"
          variant="standalone"
          size="sm"
          items={LIBRARY_TABS.map((t) => ({ value: t.value, label: TYPE_SINGULAR[t.value] }))}
          value={type}
          onChange={setType}
        />
        {/* Remounted on a new kind: each kind has its own fields. */}
        <EntityForm key={type} type={type} saving={saving} onSave={handleSave} onCancel={() => router.push(libraryHref(type))} />
      </div>
    </div>
  )
}

export default function NewEntityPage() {
  return (
    <Suspense fallback={<p className="p-4 text-sm text-ink-muted md:p-8">Loading…</p>}>
      <NewEntity />
    </Suspense>
  )
}
