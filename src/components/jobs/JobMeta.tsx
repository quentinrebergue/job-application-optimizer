'use client'

import type { ApplicationStatus, JobOffer } from '@/types'
import { APPLICATION_STATUSES, APPLICATION_STATUS_LABELS } from '@/config'
import { Tabs } from '@/components/ui/Tabs'
import { formatDate } from '@/lib/format'
import { eyebrow } from '@/components/ui/styles'

interface Props {
  job: JobOffer
  onStatusChange: (status: ApplicationStatus) => void
  statusDisabled?: boolean
}

/** Read-only view of a job: status selector, dates, link and description. */
export function JobMeta({ job, onStatusChange, statusDisabled }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className={eyebrow}>Status</p>
        <fieldset disabled={statusDisabled} className="disabled:opacity-60">
          <Tabs
            label="Application status"
            items={APPLICATION_STATUSES.map((s) => ({ value: s, label: APPLICATION_STATUS_LABELS[s] }))}
            value={job.status}
            onChange={onStatusChange}
          />
        </fieldset>
      </div>

      <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[8rem_1fr]">
        <dt className="font-semibold text-ink-muted">Added</dt>
        <dd className="tabular-nums">{formatDate(job.date_added, 'long')}</dd>
        {job.location && (
          <>
            <dt className="font-semibold text-ink-muted">Location</dt>
            <dd>{job.location}</dd>
          </>
        )}
        {job.url && (
          <>
            <dt className="font-semibold text-ink-muted">Offer</dt>
            <dd className="min-w-0">
              <a
                href={job.url}
                target="_blank"
                rel="noreferrer"
                className="break-all font-semibold text-accent-strong underline underline-offset-4"
              >
                {job.url}
              </a>
            </dd>
          </>
        )}
      </dl>

      {job.description && (
        <div className="flex flex-col gap-2">
          <p className={eyebrow}>Description</p>
          <div className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-control border-2 border-ink bg-surface p-4 text-sm leading-relaxed">
            {job.description}
          </div>
        </div>
      )}
    </div>
  )
}
