'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { JobCard } from '@/components/jobs/JobCard'
import { Tabs } from '@/components/ui/Tabs'
import { buttonClasses } from '@/components/ui/Button'
import type { ApplicationStatus, JobOffer } from '@/types'
import { APPLICATION_STATUSES, APPLICATION_STATUS_LABELS, FEATURES } from '@/config'

const TABS: { label: string; value: ApplicationStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  ...APPLICATION_STATUSES.map((s) => ({ label: APPLICATION_STATUS_LABELS[s], value: s })),
]

interface Props {
  initialJobs: JobOffer[]
}

export function JobsClient({ initialJobs }: Props) {
  const [tab, setTab] = useState<ApplicationStatus | 'all'>('all')

  const filtered = tab === 'all'
    ? initialJobs
    : initialJobs.filter((j) => j.status === tab)

  return (
    <div className="p-4 md:p-8 max-w-5xl">
      <PageHeader
        title="Job Tracker"
        subtitle="Track your applications from saved to offer."
      >
        {FEATURES.linkedinImport && (
          <Link
            href="/jobs/bookmarklet"
            className={buttonClasses({ variant: 'secondary' })}
          >
            LinkedIn Import
          </Link>
        )}
        <Link
          href="/jobs/new"
          className={buttonClasses()}
        >
          <Plus size={16} aria-hidden="true" />
          Add Job
        </Link>
      </PageHeader>

      <Tabs
        label="Filter by status"
        items={TABS.map((t) => ({
          ...t,
          count: t.value === 'all' ? initialJobs.length : initialJobs.filter((j) => j.status === t.value).length,
        }))}
        value={tab}
        onChange={setTab}
        className="mb-6"
      />

      {/* Content */}
      {filtered.length === 0 ? (
        <div className="rounded-control border-2 border-dashed border-ink p-10 text-center">
          <p className="mb-3 text-ink-muted">No jobs here yet.</p>
          <Link href="/jobs/new" className={buttonClasses()}>
            <Plus size={15} aria-hidden="true" />
            Add your first job
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((j) => (
            <JobCard key={j.id} job={j} />
          ))}
        </div>
      )}
    </div>
  )
}
