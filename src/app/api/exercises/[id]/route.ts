import { NextResponse } from 'next/server'
import { getExercise, updateExercise, deleteExercise } from '@/lib/data'
import { getSessionUserId } from '@/lib/auth/session'

type Params = Promise<{ id: string }>

export async function GET(_req: Request, { params }: { params: Params }) {
  const userId = await getSessionUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const exercise = await getExercise(userId, id)
  if (!exercise) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(exercise)
}

export async function PUT(req: Request, { params }: { params: Params }) {
  const userId = await getSessionUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  try {
    const body = await req.json() as Record<string, unknown>
    const updated = await updateExercise(userId, id, body as never)
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Params }) {
  const userId = await getSessionUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const ok = await deleteExercise(userId, id)
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return new NextResponse(null, { status: 204 })
}
