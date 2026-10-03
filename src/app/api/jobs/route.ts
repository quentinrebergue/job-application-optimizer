import { NextResponse } from 'next/server'
import { listJobs, createJob } from '@/lib/data'
import type { JobOffer } from '@/types'
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
  let body: Omit<JobOffer, 'id' | 'date_added'>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  if (!body.company || !body.title || !body.description || !body.status) {
    return NextResponse.json({ error: 'Missing required fields: company, title, description, status' }, { status: 400 })
  }
  // A failure past this point is ours, not the request's: log it and say so (#97).
  try {
    const job = await createJob(userId, body)
    return NextResponse.json(job, { status: 201 })
  } catch (err) {
    console.error('create job failed', err)
    return NextResponse.json({ error: 'The job could not be saved. Try again.' }, { status: 500 })
  }
}
