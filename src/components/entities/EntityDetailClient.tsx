'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { EntityMeta, EntityType } from '@/types'
import { Alert } from '@/components/ui/Alert'
import { ConfirmDrawer } from '@/components/ui/ConfirmDrawer'
import { eyebrow } from '@/components/ui/styles'
import { fetchJson } from '@/lib/http'
import { EntityEditor } from './EntityEditor'
import type { SaveState } from '@/hooks/useFieldAutosave'
import { TYPE_SINGULAR, entityTitle } from './entity-fields'
import { libraryHref } from '@/lib/entity-filter'
import { page } from '@/components/ui/styles'
import { cn } from '@/lib/cn'

interface Props { initialEntity: EntityMeta }

/** A library entry: its fields, saved as you type, and its deletion. */
export function EntityDetailClient({ initialEntity }: Props) {
  const router = useRouter()
  const [entity, setEntity] = useState<EntityMeta>(initialEntity)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const type = entity.type as EntityType

  async function handleDelete() {
    setDeleting(true)
    setError(null)
    try {
      await fetchJson(`/api/entities/${type}/${entity.id}`, { method: 'DELETE' })
      router.push(libraryHref(type))
    } catch (err) {
      setError(`Entry not deleted: ${err instanceof Error ? err.message : 'try again.'}`)
      setDeleting(false)
    }
  }

  return (
    <div className={cn(page, 'flex flex-col gap-6')}>
      <header className="flex flex-col gap-3 border-b-2 border-ink pb-6">
        <div className="flex items-center justify-between gap-3">
          <Link href={libraryHref(type)} className="text-sm font-semibold text-ink-muted underline-offset-4 hover:text-ink hover:underline">
            ← Library
          </Link>
          <p aria-live="polite" className="text-sm text-ink-muted">{saveState === 'saving' ? 'Saving…' : ''}</p>
        </div>
        <div>
          <p className={eyebrow}>{TYPE_SINGULAR[type]}</p>
          <h1 className="text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">{entityTitle(entity) || 'Untitled'}</h1>
        </div>
        {error && <Alert>{error}</Alert>}
      </header>

      <section aria-label="Entry" className="rounded-control border-2 border-ink bg-panel p-4 shadow-hard md:p-6">
        <EntityEditor
          entity={entity}
          onSaved={(updated) => setEntity((prev) => ({ ...prev, ...updated }))}
          onDelete={() => setConfirmDelete(true)}
          deleting={deleting}
          onSaveStateChange={setSaveState}
        />
      </section>

      <ConfirmDrawer
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this entry?"
        description="It is removed from your library and from the resumes of your jobs. This cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />
    </div>
  )
}
