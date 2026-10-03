'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { JobCard } from '@/components/jobs/JobCard'
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
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            LinkedIn Import
          </Link>
        )}
        <Link
          href="/jobs/new"
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          Add Job
        </Link>
      </PageHeader>

      {/* Status tabs */}
      <div className="flex flex-wrap gap-1 mb-6 border-b border-slate-200">
        {TABS.map((t) => {
          const count = t.value === 'all'
            ? initialJobs.length
            : initialJobs.filter((j) => j.status === t.value).length
          return (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={[
                'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                tab === t.value
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-900',
              ].join(' ')}
            >
              {t.label}
              <span className="ml-1.5 text-xs text-slate-400">({count})</span>
            </button>
          )
        })}
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-200 p-10 text-center">
          <p className="text-slate-500 mb-3">No jobs here yet.</p>
          <Link
            href="/jobs/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <Plus size={15} />
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
