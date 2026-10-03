import { APPLICATION_STATUSES } from '@/config'
import type { ApplicationStatus } from '@/types'

export type StatusFilter = ApplicationStatus | 'all'

/** The `status` query parameter of /jobs as a filter; anything unknown means all jobs. */
export function parseStatusFilter(value: string | string[] | undefined): StatusFilter {
  return typeof value === 'string' && (APPLICATION_STATUSES as readonly string[]).includes(value)
    ? (value as ApplicationStatus)
    : 'all'
}
