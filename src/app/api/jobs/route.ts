import { NextResponse } from 'next/server'
import { listJobs, createJob } from '@/lib/data'
import type { JobOffer } from '@/types'

export async function GET() {
  const jobs = await listJobs()
  return NextResponse.json(jobs)
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Omit<JobOffer, 'id' | 'date_added'>
    if (!body.company || !body.title || !body.description || !body.status) {
      return NextResponse.json({ error: 'Missing required fields: company, title, description, status' }, { status: 400 })
    }
    const job = await createJob(body)
    return NextResponse.json(job, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
