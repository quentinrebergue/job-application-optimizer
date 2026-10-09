import { NextResponse } from 'next/server'
import { getJob, updateJob, deleteJob } from '@/lib/data'
import { getSessionUserId } from '@/lib/auth/session'
import { JobUpdateSchema } from '@/schemas/inputs'
import { readJson } from '@/lib/validation/read-json'

type Params = Promise<{ id: string }>

export async function GET(_req: Request, { params }: { params: Params }) {
  const userId = await getSessionUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const job = await getJob(userId, id)
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(job)
}

export async function PUT(req: Request, { params }: { params: Params }) {
  const userId = await getSessionUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const body = await readJson(req, JobUpdateSchema)
  if (!body.ok) return body.response
  const updated = await updateJob(userId, id, body.data)
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(updated)
}

export async function DELETE(_req: Request, { params }: { params: Params }) {
  const userId = await getSessionUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const ok = await deleteJob(userId, id)
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return new NextResponse(null, { status: 204 })
}
