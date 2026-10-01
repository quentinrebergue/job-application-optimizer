import { NextResponse } from 'next/server'
import { getJob, getResumeConfig, saveResumeConfig } from '@/lib/data'
import type { ResumeConfig } from '@/types'
import { getSessionUserId } from '@/lib/auth/session'

type Params = Promise<{ id: string }>

export async function GET(_req: Request, { params }: { params: Params }) {
  const userId = await getSessionUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const job = await getJob(userId, id)
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  const config = await getResumeConfig(userId, id)
  return NextResponse.json(config)
}

export async function PUT(req: Request, { params }: { params: Params }) {
  const userId = await getSessionUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const job = await getJob(userId, id)
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  try {
    const config = (await req.json()) as ResumeConfig
    await saveResumeConfig(userId, id, config)
    return NextResponse.json(config)
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
