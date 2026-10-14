'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { StatusFilter } from '@/lib/job-filter'
import { Plus } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { JobCard } from '@/components/jobs/JobCard'
import { FilterBar } from '@/components/ui/FilterBar'
import { buttonClasses } from '@/components/ui/Button'
import type { JobOffer } from '@/types'
import { APPLICATION_STATUSES, APPLICATION_STATUS_LABELS } from '@/config'
import { page } from '@/components/ui/styles'

const TABS: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'all' },
  ...APPLICATION_STATUSES.map((s) => ({ label: APPLICATION_STATUS_LABELS[s], value: s })),
]

interface Props {
  initialJobs: JobOffer[]
  initialFilter: StatusFilter
}

export function JobsClient({ initialJobs, initialFilter }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<StatusFilter>(initialFilter)

  function changeFilter(value: StatusFilter) {
    setTab(value)
    router.replace(value === 'all' ? '/jobs' : `/jobs?status=${value}`, { scroll: false })
  }

  const filtered = tab === 'all'
    ? initialJobs
    : initialJobs.filter((j) => j.status === tab)

  return (
    <div className={page}>
      <PageHeader
        title="Job Tracker"
      >
        <Link
          href="/jobs/new"
          className={buttonClasses()}
        >
          <Plus size={16} aria-hidden="true" />
          Add Job
        </Link>
      </PageHeader>

      <div className="mb-6">
        <FilterBar
          label="Filter by status"
          options={TABS.map((t) => ({
            ...t,
            count: t.value === 'all' ? initialJobs.length : initialJobs.filter((j) => j.status === t.value).length,
          }))}
          value={tab}
          onChange={changeFilter}
        />
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <div className="rounded-control border-2 border-dashed border-ink p-10 text-center">
          {tab === 'all' ? (
            <>
              <p className="mb-4 text-ink-muted">No jobs yet.</p>
              <Link href="/jobs/new" className={buttonClasses()}>
                <Plus size={15} aria-hidden="true" />
                Add your first job
              </Link>
            </>
          ) : (
            <p className="text-ink-muted">No {APPLICATION_STATUS_LABELS[tab].toLowerCase()} jobs.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((j) => (
            <JobCard key={j.id} job={j} />
          ))}
        </div>
      )}
    </div>
  )
}
