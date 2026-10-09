import { NextResponse } from 'next/server'
import { listJobs, createJob, countJobs } from '@/lib/data'
import { capReached, consumeCreation, quotas } from '@/lib/quotas'
import { JobCreateSchema } from '@/schemas/inputs'
import { readJson } from '@/lib/validation/read-json'
import { getSessionUserId } from '@/lib/auth/session'

export async function GET() {
  const userId = await getSessionUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const jobs = await listJobs(userId)
  return NextResponse.json(jobs)
}

export async function POST(request: Request) {
  const userId = await getSessionUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await readJson(request, JobCreateSchema)
  if (!body.ok) return body.response
  // The cap first (it costs nothing to refuse), then the rate, which counts this creation.
  if ((await countJobs(userId)) >= quotas().maxJobs) return capReached(quotas().maxJobs, 'jobs')
  const limited = await consumeCreation(userId, 'job')
  if (limited) return limited
  // A failure past this point is ours, not the request's: log it and say so (#97).
  try {
    const job = await createJob(userId, { ...body.data, tags: body.data.tags ?? [] })
    return NextResponse.json(job, { status: 201 })
  } catch (err) {
    console.error('create job failed', err)
    return NextResponse.json({ error: 'The job could not be saved. Try again.' }, { status: 500 })
  }
}
