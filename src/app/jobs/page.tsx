import { listJobs } from '@/lib/data'
import { JobsClient } from '@/components/jobs/JobsClient'

// Server component — fetches data directly, no client-side fetch needed
export default async function JobsPage() {
  const jobs = await listJobs()
  return <JobsClient initialJobs={jobs} />
}
