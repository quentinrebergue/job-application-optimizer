'use client'

import { useState } from 'react'
import type { EntityType, ExperienceMeta, ProjectMeta, SkillMeta, EducationMeta } from '@/types'

type FormValues = {
  // shared
  tags: string
  // experience
  title?: string
  company?: string
  location?: string
  period?: string
  description?: string
  // project
  tech?: string
  // skill
  name?: string
  category?: string
  level?: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  // education
  degree?: string
  institution?: string
}

type InitialData = Partial<ExperienceMeta> | Partial<ProjectMeta> | Partial<SkillMeta> | Partial<EducationMeta>

interface Props {
  type: EntityType
  initial?: InitialData
  saving?: boolean
  onSave: (data: Omit<ExperienceMeta | ProjectMeta | SkillMeta | EducationMeta, 'id' | 'type'>) => Promise<void>
  onCancel?: () => void
}

function toFormValues(type: EntityType, initial?: InitialData): FormValues {
  if (!initial) return { tags: '', level: 'intermediate' }
  const base: FormValues = {
    tags: (initial.tags ?? []).join(', '),
    level: 'intermediate',
  }
  if (type === 'experiences') {
    const e = initial as Partial<ExperienceMeta>
    return { ...base, title: e.title ?? '', company: e.company ?? '', location: e.location ?? '', period: e.period ?? '', description: e.description ?? '' }
  }
  if (type === 'projects') {
    const p = initial as Partial<ProjectMeta>
    return { ...base, title: p.title ?? '', tech: (p.tech ?? []).join(', '), description: p.description ?? '' }
  }
  const s = initial as Partial<SkillMeta>
  if (type === 'skills') return { ...base, name: s.name ?? '', category: s.category ?? '', level: s.level ?? 'intermediate' }
  const e = initial as Partial<EducationMeta>
  return { ...base, degree: e.degree ?? '', institution: e.institution ?? '', period: e.period ?? '' }
}

function parseTags(raw: string): string[] {
  return raw.split(',').map((t) => t.trim()).filter(Boolean)
}

export function EntityForm({ type, initial, saving, onSave, onCancel }: Props) {
  const [values, setValues] = useState<FormValues>(() => toFormValues(type, initial))
  const [error, setError] = useState<string | null>(null)

  function set(key: keyof FormValues, value: string) {
    setValues((v) => ({ ...v, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      if (type === 'experiences') {
        if (!values.title?.trim() || !values.company?.trim()) {
          setError('Title and company are required.')
          return
        }
        await onSave({
          title: values.title!.trim(),
          company: values.company!.trim(),
          location: values.location?.trim() ?? '',
          period: values.period?.trim() ?? '',
          description: values.description?.trim() ?? '',
          tags: parseTags(values.tags),
        } as Omit<ExperienceMeta, 'id' | 'type'>)
      } else if (type === 'projects') {
        if (!values.title?.trim()) {
          setError('Title is required.')
          return
        }
        await onSave({
          title: values.title!.trim(),
          tech: parseTags(values.tech ?? ''),
          description: values.description?.trim() ?? '',
          tags: parseTags(values.tags),
        } as Omit<ProjectMeta, 'id' | 'type'>)
      } else if (type === 'skills') {
        if (!values.name?.trim() || !values.category?.trim()) {
          setError('Name and category are required.')
          return
        }
        await onSave({
          name: values.name!.trim(),
          category: values.category!.trim(),
          level: values.level ?? 'intermediate',
          tags: parseTags(values.tags),
        } as Omit<SkillMeta, 'id' | 'type'>)
      } else {
        if (!values.degree?.trim() || !values.institution?.trim()) {
          setError('Degree and institution are required.')
          return
        }
        await onSave({
          degree: values.degree!.trim(),
          institution: values.institution!.trim(),
          period: values.period?.trim() ?? '',
          tags: parseTags(values.tags),
        } as Omit<EducationMeta, 'id' | 'type'>)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Experience fields */}
      {type === 'experiences' && (
        <>
          <Field label="Title *" value={values.title ?? ''} onChange={(v) => set('title', v)} placeholder="Software Engineer Intern" />
          <Field label="Company *" value={values.company ?? ''} onChange={(v) => set('company', v)} placeholder="Acme Corp" />
          <Field label="Location" value={values.location ?? ''} onChange={(v) => set('location', v)} placeholder="Paris" />
          <Field label="Period" value={values.period ?? ''} onChange={(v) => set('period', v)} placeholder="Jun 2024 – Sep 2024" />
          <TextArea label="Description" value={values.description ?? ''} onChange={(v) => set('description', v)} placeholder="Describe your role and achievements…" />
        </>
      )}

      {/* Project fields */}
      {type === 'projects' && (
        <>
          <Field label="Title *" value={values.title ?? ''} onChange={(v) => set('title', v)} placeholder="Distributed Task Queue" />
          <Field label="Technologies (comma-separated)" value={values.tech ?? ''} onChange={(v) => set('tech', v)} placeholder="Python, Redis, Docker" />
          <TextArea label="Description" value={values.description ?? ''} onChange={(v) => set('description', v)} placeholder="Describe the project and your contributions…" />
        </>
      )}

      {/* Skill fields */}
      {type === 'skills' && (
        <>
          <Field label="Name *" value={values.name ?? ''} onChange={(v) => set('name', v)} placeholder="TypeScript" />
          <Field label="Category *" value={values.category ?? ''} onChange={(v) => set('category', v)} placeholder="Programming Languages" />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Level</label>
            <select
              value={values.level}
              onChange={(e) => set('level', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
              <option value="expert">Expert</option>
            </select>
          </div>
        </>
      )}

      {/* Education fields */}
      {type === 'education' && (
        <>
          <Field label="Degree *" value={values.degree ?? ''} onChange={(v) => set('degree', v)} placeholder="MSc Computer Engineering" />
          <Field label="Institution *" value={values.institution ?? ''} onChange={(v) => set('institution', v)} placeholder="EPITA" />
          <Field label="Period" value={values.period ?? ''} onChange={(v) => set('period', v)} placeholder="2020 – 2026" />
        </>
      )}

      {/* Shared fields */}
      <Field
        label="Tags (comma-separated)"
        value={values.tags}
        onChange={(v) => set('tags', v)}
        placeholder="backend, typescript, node"
      />

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}

// ─── Small local helpers ─────────────────────────────────────────────────────

function Field({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  )
}

function TextArea({ label, value, onChange, placeholder, rows = 3, mono = false }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; mono?: boolean
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={`w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y${mono ? ' font-mono' : ''}`}
      />
    </div>
  )
}
