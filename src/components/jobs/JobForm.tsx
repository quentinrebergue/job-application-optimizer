'use client'

import { useState } from 'react'
import type { ApplicationStatus, JobOffer } from '@/types'
import { APPLICATION_STATUSES, APPLICATION_STATUS_LABELS } from '@/config'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Input, Select, Textarea } from '@/components/ui/Input'

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
  /** Throws to report a failure; the message is shown above the form. */
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
  const [missing, setMissing] = useState(false)

  function set(key: keyof FormValues, value: string) {
    setValues((v) => ({ ...v, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!values.title.trim() || !values.company.trim()) {
      setMissing(true)
      return
    }
    setMissing(false)
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
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.')
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {error && <Alert>{error}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Job title" error={missing && !values.title.trim() ? 'Enter the job title.' : undefined}>
          <Input value={values.title} onChange={(e) => set('title', e.target.value)} placeholder="Software Engineer" required />
        </Field>
        <Field label="Company" error={missing && !values.company.trim() ? 'Enter the company.' : undefined}>
          <Input value={values.company} onChange={(e) => set('company', e.target.value)} placeholder="Acme Corp" required />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Location">
          <Input value={values.location} onChange={(e) => set('location', e.target.value)} placeholder="Paris, France" />
        </Field>
        <Field label="Status">
          <Select value={values.status} onChange={(e) => set('status', e.target.value)}>
            {APPLICATION_STATUSES.map((s) => (
              <option key={s} value={s}>{APPLICATION_STATUS_LABELS[s]}</option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Job URL">
        <Input type="url" value={values.url} onChange={(e) => set('url', e.target.value)} placeholder="https://..." />
      </Field>

      <Field label="Job description" hint="The full text of the offer. The AI uses it to pick your best experiences.">
        <Textarea value={values.description} onChange={(e) => set('description', e.target.value)} rows={8} className="resize-y" />
      </Field>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        {onCancel && <Button variant="secondary" onClick={onCancel}>Cancel</Button>}
      </div>
    </form>
  )
}
