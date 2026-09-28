import { NextResponse } from 'next/server'
import { updateGeneralQuestion, deleteGeneralQuestion } from '@/lib/data'

type Params = Promise<{ id: string }>

export async function PUT(req: Request, { params }: { params: Params }) {
  const { id } = await params
  try {
    const body = await req.json() as Record<string, unknown>
    const updated = await updateGeneralQuestion(id, body as never)
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Params }) {
  const { id } = await params
  const ok = await deleteGeneralQuestion(id)
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return new NextResponse(null, { status: 204 })
}
