import { NextResponse } from 'next/server'
import { listJobs, createJob } from '@/lib/data'
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
  // A failure past this point is ours, not the request's: log it and say so (#97).
  try {
    const job = await createJob(userId, { ...body.data, tags: body.data.tags ?? [] })
    return NextResponse.json(job, { status: 201 })
  } catch (err) {
    console.error('create job failed', err)
    return NextResponse.json({ error: 'The job could not be saved. Try again.' }, { status: 500 })
  }
}
