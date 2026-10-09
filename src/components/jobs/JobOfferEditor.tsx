'use client'

import { useEffect } from 'react'
import type { JobOffer } from '@/types'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Input, Textarea } from '@/components/ui/Input'
import { LIMITS } from '@/config/limits'
import { counterFor, tooLong } from '@/lib/text-limit'
import { useJobAutosave, type SaveState } from './useJobAutosave'

interface Props {
  job: JobOffer
  onSaved: (job: JobOffer) => void
  onDelete: () => void
  deleting: boolean
  /** The page shows one save indicator for the offer and the resume */
  onSaveStateChange?: (state: SaveState) => void
}

/** The job offer, always editable: every field saves itself. */
export function JobOfferEditor({ job, onSaved, onDelete, deleting, onSaveStateChange }: Props) {
  const { drafts, errors, state, failure, edit } = useJobAutosave(job, onSaved)
  useEffect(() => { onSaveStateChange?.(state) }, [state, onSaveStateChange])

  return (
    <div className="flex flex-col gap-4">
      {failure && <Alert>Offer not saved: {failure}</Alert>}

      {/* One field per row in the narrow desktop column, two side by side elsewhere. */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <Field label="Job title" error={errors.title}>
          <Input value={drafts.title} onChange={(e) => edit('title', e.target.value)} maxLength={LIMITS.job.title} required />
        </Field>
        <Field label="Company" error={errors.company}>
          <Input value={drafts.company} onChange={(e) => edit('company', e.target.value)} maxLength={LIMITS.job.company} required />
        </Field>
        <Field label="Location">
          <Input value={drafts.location} onChange={(e) => edit('location', e.target.value)} maxLength={LIMITS.job.location} placeholder="Paris, France" />
        </Field>
        <Field label="Offer link">
          <Input type="url" value={drafts.url} onChange={(e) => edit('url', e.target.value)} maxLength={LIMITS.job.url} placeholder="https://..." />
        </Field>
      </div>
      {drafts.url && (
        <a href={drafts.url} target="_blank" rel="noreferrer" className="self-start text-sm font-semibold text-accent-strong underline underline-offset-4">
          Open the offer
        </a>
      )}

      <Field
        label="Description"
        hint="The full text of the offer. The AI reads it to pick your best entries."
        error={errors.description || tooLong(drafts.description, LIMITS.job.description)}
        count={counterFor(drafts.description, LIMITS.job.description)}
      >
        <Textarea value={drafts.description} onChange={(e) => edit('description', e.target.value)} autoGrow />
      </Field>

      <div className="mt-2 flex justify-end">
        <Button variant="danger" size="sm" onClick={onDelete} disabled={deleting}>
          {deleting ? 'Deleting…' : 'Delete job'}
        </Button>
      </div>
    </div>
  )
}
