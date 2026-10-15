import { APPLICATION_STATUSES } from '@/config'
import type { ApplicationStatus } from '@/types'

export type StatusFilter = ApplicationStatus | 'all'

/** The `status` query parameter of /jobs as a filter; anything unknown means all jobs. */
export function parseStatusFilter(value: string | string[] | undefined): StatusFilter {
  return typeof value === 'string' && (APPLICATION_STATUSES as readonly string[]).includes(value)
    ? (value as ApplicationStatus)
    : 'all'
}

/** The longest search kept: a pasted page of text is not a search. */
export const MAX_QUERY_LENGTH = 100

/** The `q` query parameter of /jobs as a search: trimmed and cut, empty when there is none. */
export function parseQuery(value: string | string[] | undefined): string {
  return typeof value === 'string' ? value.trim().slice(0, MAX_QUERY_LENGTH) : ''
}

/** Lower case without accents, so that "ecole" finds "École" and "SENIOR" finds "Senior". */
const plain = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

/**
 * Whether a job answers a search: every word typed is found in its title or its company, in any order
 * ("backend acme" finds "Backend Engineer" at "Acme"). An empty search finds every job.
 */
export function matchesQuery(job: { title: string; company: string }, query: string): boolean {
  const words = plain(query).split(/\s+/).filter(Boolean)
  if (words.length === 0) return true
  const haystack = `${plain(job.title)} ${plain(job.company)}`
  return words.every((word) => haystack.includes(word))
}

/** The address of /jobs for a status and a search: only what differs from the default is written. */
export function jobsHref(status: StatusFilter, query: string): string {
  const params = new URLSearchParams()
  if (status !== 'all') params.set('status', status)
  if (query.trim()) params.set('q', query.trim().slice(0, MAX_QUERY_LENGTH))
  const text = params.toString()
  return text ? `/jobs?${text}` : '/jobs'
}

export type JobTab = 'offer' | 'resume' | 'cover-letter'

/** The `tab` query parameter of a job page; anything unknown opens the offer (the cover letter is not built yet). */
export function parseJobTab(value: string | string[] | undefined): JobTab {
  if (value === 'resume') return 'resume'
  return 'offer'
}
