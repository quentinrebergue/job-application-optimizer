import { NextResponse } from 'next/server'
import { getJob, getResumeConfig, saveResumeConfig } from '@/lib/data'
import { ResumeConfigInputSchema } from '@/schemas/inputs'
import { readJson } from '@/lib/validation/read-json'
import { MAX_BODY_BYTES } from '@/config/limits'
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
  const body = await readJson(req, ResumeConfigInputSchema, MAX_BODY_BYTES.resumeConfig)
  if (!body.ok) return body.response
  await saveResumeConfig(userId, id, body.data)
  return NextResponse.json(body.data)
}
