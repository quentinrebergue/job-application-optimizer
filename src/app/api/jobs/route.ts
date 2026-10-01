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
  try {
    const body = (await request.json()) as Omit<JobOffer, 'id' | 'date_added'>
    if (!body.company || !body.title || !body.description || !body.status) {
      return NextResponse.json({ error: 'Missing required fields: company, title, description, status' }, { status: 400 })
    }
    const job = await createJob(userId, body)
    return NextResponse.json(job, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
