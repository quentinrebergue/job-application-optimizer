'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { PageHeader } from '@/components/ui/PageHeader'
import { Alert } from '@/components/ui/Alert'
import { JobForm } from '@/components/jobs/JobForm'
import { fetchJson } from '@/lib/http'
import type { JobOffer } from '@/types'

function NewJobForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [saving, setSaving] = useState(false)

  const initial: Partial<JobOffer> = {
    title: searchParams.get('title') ?? undefined,
    company: searchParams.get('company') ?? undefined,
    url: searchParams.get('url') ?? undefined,
    description: searchParams.get('description') ?? undefined,
  }

  const hasImport = Boolean(searchParams.get('title') || searchParams.get('company'))

  async function handleSave(data: Omit<JobOffer, 'id' | 'date_added'>) {
    setSaving(true)
    try {
      const job = await fetchJson<JobOffer>('/api/jobs', { method: 'POST', json: data })
      router.push(`/jobs/${job.id}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl p-4 md:p-8">
      <PageHeader
        title="Add job"
        subtitle={hasImport ? 'Imported from LinkedIn. Review and save.' : 'Paste the offer, save, then generate the resume.'}
      />
      {hasImport && (
        <Alert variant="success" className="mb-6">Job details imported. Check the description, then save.</Alert>
      )}
      {/* Cancel goes to the list: opened in a new tab, there is no history to go back to. */}
      <JobForm initial={initial} saving={saving} onSave={handleSave} onCancel={() => router.push('/jobs')} />
    </div>
  )
}

export default function NewJobPage() {
  return (
    <Suspense fallback={<p className="p-4 text-sm text-ink-muted md:p-8">Loading…</p>}>
      <NewJobForm />
    </Suspense>
  )
}
