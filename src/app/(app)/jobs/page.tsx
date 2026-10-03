import { listJobs } from '@/lib/data'
import { JobsClient } from '@/components/jobs/JobsClient'
import { parseStatusFilter } from '@/lib/job-filter'
import { verifySession } from '@/lib/auth/dal'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Jobs' }

// Server component — fetches data directly, no client-side fetch needed.
// The status filter lives in the URL (?status=applied) so it survives a visit to a job.
export default async function JobsPage({ searchParams }: PageProps<'/jobs'>) {
  const { userId } = await verifySession()
  const [jobs, { status }] = await Promise.all([listJobs(userId), searchParams])
  return <JobsClient initialJobs={jobs} initialFilter={parseStatusFilter(status)} />
}
