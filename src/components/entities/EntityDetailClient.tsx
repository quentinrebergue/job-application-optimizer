'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { EntityForm } from '@/components/entities/EntityForm'
import { QuestionEditor } from '@/components/entities/QuestionEditor'
import { Badge } from '@/components/ui/Badge'
import type { Entity, EntityMeta, EntityQuestion, EntityType, ExperienceMeta, ProjectMeta, SkillMeta } from '@/types'

const TYPE_LABELS: Record<EntityType, string> = {
  experiences: 'Experience',
  projects: 'Project',
  skills: 'Skill',
  education: 'Education',
}

interface Props { initialEntity: Entity }

export function EntityDetailClient({ initialEntity }: Props) {
  const router = useRouter()
  const [entity, setEntity] = useState<Entity>(initialEntity)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savingQ, setSavingQ] = useState(false)
  const [questions, setQuestions] = useState<EntityQuestion[]>(initialEntity.questions ?? [])

  const { type, id } = entity as Entity & { id: string }

  async function handleSaveMeta(data: Omit<ExperienceMeta | ProjectMeta | SkillMeta, 'id' | 'type'>) {
    setSaving(true)
    const res = await fetch(`/api/entities/${type}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    setSaving(false)
    if (res.ok) {
      const updated: EntityMeta = await res.json()
      setEntity((prev) => ({ ...prev, ...updated }))
      setEditing(false)
    }
  }

  async function handleSaveQuestions(updated: EntityQuestion[]) {
    setQuestions(updated)
    setSavingQ(true)
    await fetch(`/api/entities/${type}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questions: updated }),
    })
    setSavingQ(false)
  }

  async function handleDelete() {
    if (!confirm('Delete this entity? This cannot be undone.')) return
    await fetch(`/api/entities/${type}/${id}`, { method: 'DELETE' })
    router.push('/entities')
  }

  const title = entity.type === 'skills' ? entity.name
    : entity.type === 'education' ? entity.degree
    : entity.title
  const entityType = entity.type as EntityType

  return (
    <div className="p-4 md:p-8 max-w-3xl">
      <Link href="/entities" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 mb-6 transition-colors">
        <ArrowLeft size={14} /> Entity Library
      </Link>

      <PageHeader title={title}>
        <Badge label={TYPE_LABELS[entityType]} />
        <button onClick={() => setEditing((v) => !v)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
          {editing ? 'Cancel Edit' : 'Edit'}
        </button>
        <button onClick={handleDelete} className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors flex items-center gap-1">
          <Trash2 size={14} /> Delete
        </button>
      </PageHeader>

      <section className="mb-8">
        {editing ? (
          <EntityForm type={entityType} initial={entity as EntityMeta} saving={saving} onSave={handleSaveMeta} onCancel={() => setEditing(false)} />
        ) : (
          <EntityMetaView entity={entity} />
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Q&A Questions <span className="text-sm font-normal text-slate-400">({questions.length})</span>
        </h2>
        <QuestionEditor questions={questions} onChange={handleSaveQuestions} saving={savingQ} />
      </section>
    </div>
  )
}

function EntityMetaView({ entity }: { entity: Entity }) {
  const rows: { label: string; value: string | string[] }[] = []
  if (entity.type === 'experiences') {
    rows.push({ label: 'Company', value: entity.company }, { label: 'Period', value: entity.period }, { label: 'Description', value: entity.description })
  } else if (entity.type === 'projects') {
    rows.push({ label: 'Technologies', value: entity.tech }, { label: 'Description', value: entity.description })
  } else if (entity.type === 'education') {
    rows.push({ label: 'Degree', value: entity.degree }, { label: 'Institution', value: entity.institution }, { label: 'Period', value: entity.period })
  } else {
    rows.push({ label: 'Category', value: entity.category }, { label: 'Level', value: entity.level })
  }
  rows.push({ label: 'Tags', value: entity.tags })

  return (
    <dl className="space-y-3">
      {rows.map((row) => (
        <div key={row.label} className="grid grid-cols-3 gap-2">
          <dt className="text-sm font-medium text-slate-500">{row.label}</dt>
          <dd className="col-span-2 text-sm text-slate-900">
            {Array.isArray(row.value) ? (
              <div className="flex flex-wrap gap-1">
                {row.value.length > 0 ? row.value.map((v) => <Badge key={v} label={v} variant="muted" />) : <span className="text-slate-400 italic">—</span>}
              </div>
            ) : (row.value || <span className="text-slate-400 italic">—</span>)}
          </dd>
        </div>
      ))}
      {entity.latex_snippet && (
        <div>
          <dt className="text-sm font-medium text-slate-500 mb-1">LaTeX Snippet</dt>
          <dd><pre className="rounded-lg bg-slate-100 px-4 py-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap text-slate-700">{entity.latex_snippet}</pre></dd>
        </div>
      )}
    </dl>
  )
}
