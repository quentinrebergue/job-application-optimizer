'use client'

import { useEffect, useState } from 'react'
import type { JobOffer } from '@/types'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { EditToggle } from '@/components/ui/EditToggle'
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

/** Only an address that opens a web page becomes a link (a pasted `javascript:` or other scheme stays text). */
const isWebAddress = (value: string) => /^https?:\/\//i.test(value.trim())

/** One line of the offer read as text: a label and its value, or "No <label> found". */
function Row({ label, children }: { label: string; children?: React.ReactNode }) {
  return (
    <>
      <dt className="font-semibold">{label}</dt>
      <dd className="min-w-0 break-words">{children || <span className="text-ink-muted">No {label.toLowerCase()} found</span>}</dd>
    </>
  )
}

/**
 * The job offer as text, which takes little room; Edit turns it into the form (every field saves itself) and becomes
 * Done. The link is shown as the address itself, and opens the offer.
 */
export function JobOfferEditor({ job, onSaved, onDelete, deleting, onSaveStateChange }: Props) {
  const { drafts, errors, state, failure, edit } = useJobAutosave(job, onSaved)
  useEffect(() => { onSaveStateChange?.(state) }, [state, onSaveStateChange])

  const [editing, setEditing] = useState(false)

  return (
    <div className="flex flex-col gap-field">
      {failure && <Alert>Offer not saved: {failure}</Alert>}
      <div className="flex justify-end">
        <EditToggle editing={editing} name="the offer" onToggle={() => setEditing(!editing)} />
      </div>

      {editing ? (
        <>
          {/* One field per row in the narrow desktop column, two side by side elsewhere. */}
          <div className="grid gap-field sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
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

          <Field
            label="Description"
            hint="The full text of the offer. The AI reads it to pick your best entries."
            error={errors.description || tooLong(drafts.description, LIMITS.job.description)}
            count={counterFor(drafts.description, LIMITS.job.description)}
          >
            <Textarea value={drafts.description} onChange={(e) => edit('description', e.target.value)} autoGrow />
          </Field>
        </>
      ) : (
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-inline gap-y-2 text-small">
          <Row label="Job title">{drafts.title}</Row>
          <Row label="Company">{drafts.company}</Row>
          <Row label="Location">{drafts.location}</Row>
          <Row label="Offer link">
            {drafts.url && (isWebAddress(drafts.url)
              ? <a href={drafts.url.trim()} target="_blank" rel="noreferrer" className="text-small-strong break-all text-accent-strong underline underline-offset-4">{drafts.url.trim()}</a>
              : <span className="break-all">{drafts.url}</span>)}
          </Row>
          <dt className="col-span-2 mt-heading font-semibold">Description</dt>
          <dd className="col-span-2 whitespace-pre-wrap break-words">{drafts.description || <span className="text-ink-muted">No description found</span>}</dd>
        </dl>
      )}

      <div className="mt-actions flex justify-end">
        <Button variant="danger" size="sm" onClick={onDelete} disabled={deleting}>
          {deleting ? 'Deleting…' : 'Delete job'}
        </Button>
      </div>
    </div>
  )
}
