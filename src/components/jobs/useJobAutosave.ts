'use client'

import type { JobOffer } from '@/types'
import { fetchJson } from '@/lib/http'
import { useFieldAutosave } from '@/hooks/useFieldAutosave'

export type { SaveState } from '@/hooks/useFieldAutosave'
export type OfferField = 'title' | 'company' | 'location' | 'url' | 'description'

const REQUIRED: Partial<Record<OfferField, string>> = {
  title: 'Enter the job title.',
  company: 'Enter the company.',
}

function draftsOf(job: JobOffer): Record<OfferField, string> {
  return {
    title: job.title,
    company: job.company,
    location: job.location ?? '',
    url: job.url ?? '',
    description: job.description ?? '',
  }
}

/**
 * Editable fields of a job, saved on their own 0.8 s after the user stops
 * typing (one request per field). Required fields are not saved while empty.
 */
export function useJobAutosave(job: JobOffer, onSaved: (job: JobOffer) => void) {
  const { values, errors, state, failure, edit } = useFieldAutosave<Record<OfferField, string>>({
    initial: draftsOf(job),
    save: async (field, value) => {
      onSaved(await fetchJson<JobOffer>(`/api/jobs/${job.id}`, { method: 'PUT', json: { [field]: value.trim() } }))
    },
    validate: (field, value) => (value.trim() ? undefined : REQUIRED[field]),
  })
  return { drafts: values, errors, state, failure, edit }
}
