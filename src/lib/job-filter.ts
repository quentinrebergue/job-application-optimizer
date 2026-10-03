import { APPLICATION_STATUSES, FEATURES } from '@/config'
import type { ApplicationStatus } from '@/types'

export type StatusFilter = ApplicationStatus | 'all'

/** The `status` query parameter of /jobs as a filter; anything unknown means all jobs. */
export function parseStatusFilter(value: string | string[] | undefined): StatusFilter {
  return typeof value === 'string' && (APPLICATION_STATUSES as readonly string[]).includes(value)
    ? (value as ApplicationStatus)
    : 'all'
}

export type JobTab = 'offer' | 'resume' | 'cover-letter'

/** The `tab` query parameter of a job page; anything unknown or switched off opens the offer. */
export function parseJobTab(value: string | string[] | undefined): JobTab {
  if (value === 'resume') return 'resume'
  if (value === 'cover-letter' && FEATURES.coverLetter) return 'cover-letter'
  return 'offer'
}
