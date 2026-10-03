'use client'

import Link from 'next/link'
import type { JobOffer } from '@/types'
import { APPLICATION_STATUS_LABELS, APPLICATION_STATUS_BADGES } from '@/config'
import { Badge } from '@/components/ui/Badge'
import { cardClasses } from '@/components/ui/Card'
import { formatDate } from '@/lib/format'

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
    <Link href={`/jobs/${job.id}`} className={cardClasses({ interactive: true })}>
      <div className="mb-1 flex items-start justify-between gap-2">
        <span className="font-extrabold leading-tight text-ink">
          {job.title}
        </span>
        <StatusBadge status={job.status} />
      </div>
      <p className="mb-1 text-sm text-ink-muted">{job.company}</p>
      {job.location && <p className="mb-2 text-xs text-ink-muted">{job.location}</p>}
      <p className="mt-3 text-xs tabular-nums text-ink-muted">
        {formatDate(job.date_added)}
      </p>
    </Link>
  )
}
