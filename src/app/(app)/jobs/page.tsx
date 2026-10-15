import { listJobs } from '@/lib/data'
import { JobsClient } from '@/components/jobs/JobsClient'
import { parseQuery, parseStatusFilter } from '@/lib/job-filter'
import { verifySession } from '@/lib/auth/dal'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Jobs' }

// Server component — fetches data directly, no client-side fetch needed.
// The status filter (?status=applied) and the search (?q=) live in the URL so that they survive a visit to a job.
export default async function JobsPage({ searchParams }: PageProps<'/jobs'>) {
  const { userId } = await verifySession()
  const [jobs, { status, q }] = await Promise.all([listJobs(userId), searchParams])
  return <JobsClient initialJobs={jobs} initialFilter={parseStatusFilter(status)} initialQuery={parseQuery(q)} />
}
