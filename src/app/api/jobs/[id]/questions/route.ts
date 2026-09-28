import { NextResponse } from 'next/server'
import { getJobQuestions, saveJobQuestions } from '@/lib/data'
import type { EntityQuestion } from '@/types'

type Params = Promise<{ id: string }>

export async function GET(_req: Request, { params }: { params: Params }) {
  const { id } = await params
  const questions = await getJobQuestions(id)
  return NextResponse.json(questions)
}

export async function PUT(req: Request, { params }: { params: Params }) {
  const { id } = await params
  try {
    const questions = (await req.json()) as EntityQuestion[]
    await saveJobQuestions(id, questions)
    return NextResponse.json(questions)
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
