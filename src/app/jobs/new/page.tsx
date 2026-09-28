'use client'

import { Suspense } from 'react'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { PageHeader } from '@/components/ui/PageHeader'
import { JobForm } from '@/components/jobs/JobForm'
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
    const res = await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    setSaving(false)
    if (res.ok) {
      const job: JobOffer = await res.json()
      router.push(`/jobs/${job.id}`)
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl">
      <PageHeader
        title="Add Job"
        subtitle={hasImport ? 'Imported from LinkedIn — review and save.' : 'Track a new job application.'}
      />
      {hasImport && (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          ✓ Job details imported from LinkedIn. Review the description below and save.
        </div>
      )}
      <JobForm initial={initial} saving={saving} onSave={handleSave} onCancel={() => router.back()} />
    </div>
  )
}

export default function NewJobPage() {
  return (
    <Suspense fallback={<div className="p-4 md:p-8 text-sm text-slate-400">Loading…</div>}>
      <NewJobForm />
    </Suspense>
  )
}
