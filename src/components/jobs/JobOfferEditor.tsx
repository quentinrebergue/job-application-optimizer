'use client'

import type { JobOffer } from '@/types'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Input, Textarea } from '@/components/ui/Input'
import { useJobAutosave, type SaveState } from './useJobAutosave'

const STATE_LABEL: Record<SaveState, string> = { idle: '', saving: 'Saving…', saved: 'Saved', error: 'Not saved' }

interface Props {
  job: JobOffer
  onSaved: (job: JobOffer) => void
  onDelete: () => void
  deleting: boolean
}

/** The job offer, always editable: every field saves itself. */
export function JobOfferEditor({ job, onSaved, onDelete, deleting }: Props) {
  const { drafts, errors, state, failure, edit } = useJobAutosave(job, onSaved)

  return (
    <div className="flex flex-col gap-4">
      <p aria-live="polite" className="min-h-5 self-end text-sm text-ink-muted">{STATE_LABEL[state]}</p>
      {failure && <Alert>Offer not saved: {failure}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Job title" error={errors.title}>
          <Input value={drafts.title} onChange={(e) => edit('title', e.target.value)} required />
        </Field>
        <Field label="Company" error={errors.company}>
          <Input value={drafts.company} onChange={(e) => edit('company', e.target.value)} required />
        </Field>
        <Field label="Location">
          <Input value={drafts.location} onChange={(e) => edit('location', e.target.value)} placeholder="Paris, France" />
        </Field>
        <Field label="Offer link">
          <Input type="url" value={drafts.url} onChange={(e) => edit('url', e.target.value)} placeholder="https://..." />
        </Field>
      </div>
      {drafts.url && (
        <a href={drafts.url} target="_blank" rel="noreferrer" className="self-start text-sm font-semibold text-accent-strong underline underline-offset-4">
          Open the offer
        </a>
      )}

      <Field label="Description" hint="The full text of the offer. The AI reads it to pick your best entries.">
        <Textarea value={drafts.description} onChange={(e) => edit('description', e.target.value)} rows={14} className="resize-y" />
      </Field>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-control border-2 border-dashed border-ink p-3">
        <p className="text-sm text-ink-muted">Delete this job and its resume settings.</p>
        <Button variant="danger" size="sm" onClick={onDelete} disabled={deleting}>
          {deleting ? 'Deleting…' : 'Delete job'}
        </Button>
      </div>
    </div>
  )
}
