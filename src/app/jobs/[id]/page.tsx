import { getJob, getJobQuestions } from '@/lib/data'
import { notFound } from 'next/navigation'
import { JobDetailClient } from '@/components/jobs/JobDetailClient'

type Props = { params: Promise<{ id: string }> }

export const dynamic = 'force-dynamic'

export default async function JobDetailPage({ params }: Props) {
  const { id } = await params
  const [job, questions] = await Promise.all([getJob(id), getJobQuestions(id)])
  if (!job) notFound()
  return <JobDetailClient initialJob={job} initialQuestions={questions} />
}
