'use client'

import Link from 'next/link'
import type { JobOffer } from '@/types'
import { APPLICATION_STATUS_LABELS, APPLICATION_STATUS_BADGES } from '@/config'
import { Badge } from '@/components/ui/Badge'
import { cardClasses } from '@/components/ui/Card'
import { cn } from '@/lib/cn'
import { formatDate } from '@/lib/format'

/** Status badge; every status has the same width so a column of badges lines up. */
export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge
      label={APPLICATION_STATUS_LABELS[status] ?? status}
      variant={APPLICATION_STATUS_BADGES[status] ?? 'neutral'}
      className={cn('w-20 justify-center', className)}
    />
  )
}

/**
 * A job in the list: title (two lines at most, full title on hover), company,
 * date added. All cards in a row have the same height; the location is on the
 * job page only.
 */
export function JobCard({ job }: { job: JobOffer }) {
  return (
    <Link href={`/jobs/${job.id}`} className={cardClasses({ interactive: true, className: 'flex h-full flex-col gap-1' })}>
      <div className="flex items-start justify-between gap-3">
        <span title={job.title} className="line-clamp-2 font-extrabold leading-tight text-ink">
          {job.title}
        </span>
        <StatusBadge status={job.status} />
      </div>
      <p className="truncate text-sm text-ink-muted">{job.company}</p>
      <p className="mt-auto pt-2 text-xs tabular-nums text-ink-muted">{formatDate(job.date_added)}</p>
    </Link>
  )
}
