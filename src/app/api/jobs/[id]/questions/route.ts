import { NextResponse } from 'next/server'
import { getJobQuestions, saveJobQuestions } from '@/lib/data'
import type { EntityQuestion } from '@/types'
import { getSessionUserId } from '@/lib/auth/session'

type Params = Promise<{ id: string }>

export async function GET(_req: Request, { params }: { params: Params }) {
  const userId = await getSessionUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const questions = await getJobQuestions(userId, id)
  return NextResponse.json(questions)
}

export async function PUT(req: Request, { params }: { params: Params }) {
  const userId = await getSessionUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  try {
    const questions = (await req.json()) as EntityQuestion[]
    await saveJobQuestions(userId, id, questions)
    return NextResponse.json(questions)
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
