import { NextResponse } from 'next/server'
import { listGeneralQuestions, createGeneralQuestion } from '@/lib/data'
import { getSessionUserId } from '@/lib/auth/session'

export async function GET() {
  const userId = await getSessionUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const questions = await listGeneralQuestions(userId)
  return NextResponse.json(questions)
}

export async function POST(request: Request) {
  const userId = await getSessionUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await request.json() as { question?: string; answer?: string; tags?: string[] }
    if (!body.question || !body.answer) {
      return NextResponse.json(
        { error: 'Missing required fields: question, answer' },
        { status: 400 }
      )
    }
    const question = await createGeneralQuestion(userId, {
      question: body.question,
      answer: body.answer,
      tags: body.tags ?? [],
    })
    return NextResponse.json(question, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
