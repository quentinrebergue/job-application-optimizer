'use client'

import { useState } from 'react'
import type { ApplicationStatus, JobOffer } from '@/types'
import { APPLICATION_STATUSES, APPLICATION_STATUS_LABELS } from '@/config'

type FormValues = {
  title: string
  company: string
  description: string
  location: string
  url: string
  status: ApplicationStatus
}

interface Props {
  initial?: Partial<JobOffer>
  saving?: boolean
  onSave: (data: Omit<JobOffer, 'id' | 'date_added'>) => Promise<void>
  onCancel?: () => void
}

export function JobForm({ initial, saving, onSave, onCancel }: Props) {
  const [values, setValues] = useState<FormValues>({
    title: initial?.title ?? '',
    company: initial?.company ?? '',
    description: initial?.description ?? '',
    location: initial?.location ?? '',
    url: initial?.url ?? '',
    status: initial?.status ?? 'saved',
  })
  const [error, setError] = useState<string | null>(null)

  function set(key: keyof FormValues, value: string) {
    setValues((v) => ({ ...v, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!values.title.trim() || !values.company.trim()) {
      setError('Title and company are required.')
      return
    }
    try {
      await onSave({
        title: values.title.trim(),
        company: values.company.trim(),
        description: values.description.trim(),
        location: values.location.trim() || undefined,
        url: values.url.trim() || undefined,
        status: values.status,
      } as Omit<JobOffer, 'id' | 'date_added'>)
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

      <div className="grid grid-cols-2 gap-4">
        <Field label="Job Title *" value={values.title} onChange={(v) => set('title', v)} placeholder="Software Engineer" />
        <Field label="Company *" value={values.company} onChange={(v) => set('company', v)} placeholder="Acme Corp" />
      </div>

      <Field label="Location" value={values.location} onChange={(v) => set('location', v)} placeholder="San Francisco, CA, USA" />

      <Field label="Job URL" value={values.url} onChange={(v) => set('url', v)} placeholder="https://..." />

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
        <select
          value={values.status}
          onChange={(e) => set('status', e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {APPLICATION_STATUSES.map((s) => (
            <option key={s} value={s}>{APPLICATION_STATUS_LABELS[s]}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Job Description</label>
        <textarea
          value={values.description}
          onChange={(e) => set('description', e.target.value)}
          rows={6}
          placeholder="Paste the full job description here. Used by the AI ranker to score your entities."
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
        />
      </div>

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
