import { getJob } from '@/lib/data'
import { notFound } from 'next/navigation'
import { JobDetailClient } from '@/components/jobs/JobDetailClient'
import { parseJobTab } from '@/lib/job-filter'
import { verifySession } from '@/lib/auth/dal'

export const dynamic = 'force-dynamic'

// The selected tab (phone and tablet) lives in the URL: ?tab=resume.
export default async function JobDetailPage({ params, searchParams }: PageProps<'/jobs/[id]'>) {
  const { userId } = await verifySession()
  const [{ id }, { tab }] = await Promise.all([params, searchParams])
  const job = await getJob(userId, id)
  if (!job) notFound()
  return <JobDetailClient initialJob={job} initialTab={parseJobTab(tab)} />
}
