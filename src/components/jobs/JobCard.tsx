'use client'

import Link from 'next/link'
import type { JobOffer } from '@/types'
import { APPLICATION_STATUS_LABELS, APPLICATION_STATUS_BADGES } from '@/config'
import { Badge } from '@/components/ui/Badge'
import { cardClasses } from '@/components/ui/Card'

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      label={APPLICATION_STATUS_LABELS[status] ?? status}
      variant={APPLICATION_STATUS_BADGES[status] ?? 'neutral'}
    />
  )
}

export function JobCard({ job }: { job: JobOffer }) {
  return (
    <Link href={`/jobs/${job.id}`} className={cardClasses({ interactive: true, className: 'group' })}>
      <div className="mb-1 flex items-start justify-between gap-2">
        <span className="font-semibold leading-tight text-ink transition-colors group-hover:text-accent-strong">
          {job.title}
        </span>
        <StatusBadge status={job.status} />
      </div>
      <p className="mb-1 text-sm text-ink-muted">{job.company}</p>
      {job.location && <p className="mb-2 text-xs text-ink-muted">{job.location}</p>}
      <p className="mt-3 font-mono text-xs text-ink-muted">
        {new Date(job.date_added).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
      </p>
    </Link>
  )
}
