import { listJobs } from '@/lib/data'
import { JobsClient } from '@/components/jobs/JobsClient'
import { verifySession } from '@/lib/auth/dal'

export const dynamic = 'force-dynamic'

// Server component — fetches data directly, no client-side fetch needed
export default async function JobsPage() {
  const { userId } = await verifySession()
  const jobs = await listJobs(userId)
  return <JobsClient initialJobs={jobs} />
}
