import { getJob, getJobQuestions } from '@/lib/data'
import { notFound } from 'next/navigation'
import { JobDetailClient } from '@/components/jobs/JobDetailClient'
import { verifySession } from '@/lib/auth/dal'

type Props = { params: Promise<{ id: string }> }

export const dynamic = 'force-dynamic'

export default async function JobDetailPage({ params }: Props) {
  const { userId } = await verifySession()
  const { id } = await params
  const [job, questions] = await Promise.all([getJob(userId, id), getJobQuestions(userId, id)])
  if (!job) notFound()
  return <JobDetailClient initialJob={job} initialQuestions={questions} />
}
