import { NextResponse } from 'next/server'
import { getJob, getResumeConfig, saveResumeConfig } from '@/lib/data'
import type { ResumeConfig } from '@/types'

type Params = Promise<{ id: string }>

export async function GET(_req: Request, { params }: { params: Params }) {
  const { id } = await params
  const job = await getJob(id)
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  const config = await getResumeConfig(id)
  return NextResponse.json(config)
}

export async function PUT(req: Request, { params }: { params: Params }) {
  const { id } = await params
  const job = await getJob(id)
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  try {
    const config = (await req.json()) as ResumeConfig
    await saveResumeConfig(id, config)
    return NextResponse.json(config)
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
