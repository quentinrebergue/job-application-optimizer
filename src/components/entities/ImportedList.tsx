'use client'

import { useRef, useState } from 'react'
import type { EntityMeta, EntityType } from '@/types'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { fetchJson } from '@/lib/http'
import { groupByKind, groupTitle } from '@/lib/import-resume'
import { DeleteButton } from './DeleteButton'
import { EntityEditor } from './EntityEditor'
import { ENTITY_FIELDS, entityChips, entityTitle, toValues } from './entity-fields'
import { EditToggle, Empty, SectionTitle } from './ImportedParts'

interface Props {
  entries: EntityMeta[]
  /** An entry was saved: the list shows it as last saved. */
  onSaved: (entity: EntityMeta) => void
  onDeleted: (entity: EntityMeta) => void
}

/** The text fields of an entry other than its title and long text, in one line: "Company · City · Jun 2022 – Sep 2023". */
function detailsOf(entity: EntityMeta): string {
  const type = entity.type as EntityType
  const values = toValues(type, entity)
  return ENTITY_FIELDS[type].slice(1).filter((f) => f.kind === 'text').map((f) => values[f.key]).filter(Boolean).join(' · ')
}

/**
 * What an import added, by kind, read as text: the title, the details, the description and the keywords, all at once
 * (what is missing says so). The two buttons of an entry stay where they are: Edit turns the text into the editor of
 * the library (every field saves itself) and becomes Done; Delete takes two presses.
 */
export function ImportedList({ entries, onSaved, onDeleted }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  async function remove(entity: EntityMeta) {
    setDeletingId(entity.id)
    setError(null)
    try {
      await fetchJson(`/api/entities/${entity.type}/${entity.id}`, { method: 'DELETE' })
      setEditingId(null)
      onDeleted(entity)
      // The button the focus was on is gone: keep it inside the dialog, at the list.
      listRef.current?.focus()
    } catch (err) {
      setError(`Entry not deleted: ${err instanceof Error ? err.message : 'try again.'}`)
    } finally {
      setDeletingId(null)
    }
  }

  if (entries.length === 0) return <p className="text-small text-ink-muted">Nothing is left of this import: every entry was deleted.</p>

  return (
    <div ref={listRef} tabIndex={-1} aria-label="Entries added by the import" className="flex flex-col gap-section outline-none">
      {error && <Alert>{error}</Alert>}
      {groupByKind(entries).map((group) => (
        <section key={group.kind} aria-label={group.kind} className="flex flex-col gap-heading">
          <SectionTitle>{groupTitle(group.kind, group.entries.length)}</SectionTitle>
          <ul className="flex flex-col gap-stack">
            {group.entries.map((entity) => {
              const title = entityTitle(entity) || 'Untitled'
              const editing = editingId === entity.id
              const description = 'description' in entity ? entity.description : ''
              const details = detailsOf(entity)
              const chips = entityChips(entity)
              return (
                <li key={entity.id} className="flex flex-col gap-stack rounded-control border-2 border-ink bg-surface p-card">
                  <div className="flex items-start justify-between gap-inline">
                    <div className="min-w-0">
                      {!editing && (
                        <>
                          <p className="text-item">{title}</p>
                          {details ? <p className="mt-1 text-small text-ink-muted">{details}</p> : <Empty>No data found</Empty>}
                        </>
                      )}
                    </div>
                    <div className="ml-auto flex shrink-0 gap-inline">
                      <EditToggle editing={editing} name={title} onToggle={() => setEditingId(editing ? null : entity.id)} />
                      <DeleteButton name={title} onConfirm={() => remove(entity)} busy={deletingId === entity.id} />
                    </div>
                  </div>
                  {editing ? (
                    <EntityEditor entity={entity} onSaved={onSaved} />
                  ) : (
                    <>
                      {'description' in entity && (description ? <p className="whitespace-pre-wrap text-small">{description}</p> : <Empty>No description found</Empty>)}
                      {chips.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {chips.map((chip) => <Badge key={chip} label={chip} variant="muted" />)}
                        </div>
                      ) : (
                        entity.type !== 'skills' && <Empty>No keywords found</Empty>
                      )}
                    </>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
