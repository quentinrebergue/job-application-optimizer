import { APPLICATION_STATUSES } from '@/config'
import type { ApplicationStatus } from '@/types'

export type StatusFilter = ApplicationStatus | 'all'

/** The `status` query parameter of /jobs as a filter; anything unknown means all jobs. */
export function parseStatusFilter(value: string | string[] | undefined): StatusFilter {
  return typeof value === 'string' && (APPLICATION_STATUSES as readonly string[]).includes(value)
    ? (value as ApplicationStatus)
    : 'all'
}

export type JobTab = 'offer' | 'resume' | 'cover-letter'

/** The `tab` query parameter of a job page; anything unknown opens the offer (the cover letter is not built yet). */
export function parseJobTab(value: string | string[] | undefined): JobTab {
  if (value === 'resume') return 'resume'
  return 'offer'
}
