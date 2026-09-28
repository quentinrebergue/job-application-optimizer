import { NextResponse } from 'next/server'
import { getJob, updateJob, deleteJob } from '@/lib/data'

type Params = Promise<{ id: string }>

export async function GET(_req: Request, { params }: { params: Params }) {
  const { id } = await params
  const job = await getJob(id)
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(job)
}

export async function PUT(req: Request, { params }: { params: Params }) {
  const { id } = await params
  try {
    const body = (await req.json()) as Record<string, unknown>
    const updated = await updateJob(id, body as never)
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Params }) {
  const { id } = await params
  const ok = await deleteJob(id)
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return new NextResponse(null, { status: 204 })
}
