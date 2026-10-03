'use client'

import { useEffect, useRef, useState } from 'react'
import type { JobOffer } from '@/types'
import { fetchJson } from '@/lib/http'

export type OfferField = 'title' | 'company' | 'location' | 'url' | 'description'
export type SaveState = 'idle' | 'saving' | 'saved' | 'error'

const SAVE_DELAY_MS = 800
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
  const [drafts, setDrafts] = useState(() => draftsOf(job))
  const [errors, setErrors] = useState<Partial<Record<OfferField, string>>>({})
  const [state, setState] = useState<SaveState>('idle')
  const [failure, setFailure] = useState<string | null>(null)
  const timers = useRef<Partial<Record<OfferField, ReturnType<typeof setTimeout>>>>({})
  const inFlight = useRef(0)

  useEffect(() => {
    const pending = timers.current
    return () => { for (const t of Object.values(pending)) clearTimeout(t) }
  }, [])

  async function save(field: OfferField, value: string) {
    inFlight.current += 1
    setState('saving')
    try {
      onSaved(await fetchJson<JobOffer>(`/api/jobs/${job.id}`, { method: 'PUT', json: { [field]: value.trim() } }))
      setFailure(null)
      inFlight.current -= 1
      if (inFlight.current === 0 && Object.keys(timers.current).length === 0) setState('saved')
    } catch (err) {
      inFlight.current -= 1
      setFailure(err instanceof Error ? err.message : 'Something went wrong. Try again.')
      setState('error')
    }
  }

  function edit(field: OfferField, value: string) {
    setDrafts((d) => ({ ...d, [field]: value }))
    const pending = timers.current[field]
    if (pending) clearTimeout(pending)
    delete timers.current[field]

    const required = REQUIRED[field]
    if (required && !value.trim()) {
      setErrors((e) => ({ ...e, [field]: required }))
      return
    }
    setErrors((e) => ({ ...e, [field]: undefined }))
    setState('saving')
    timers.current[field] = setTimeout(() => {
      delete timers.current[field]
      void save(field, value)
    }, SAVE_DELAY_MS)
  }

  return { drafts, errors, state, failure, edit }
}
