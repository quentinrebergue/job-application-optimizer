import { NextResponse } from 'next/server'
import { listGeneralQuestions, createGeneralQuestion } from '@/lib/data'

export async function GET() {
  const questions = await listGeneralQuestions()
  return NextResponse.json(questions)
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { question?: string; answer?: string; tags?: string[] }
    if (!body.question || !body.answer) {
      return NextResponse.json(
        { error: 'Missing required fields: question, answer' },
        { status: 400 }
      )
    }
    const question = await createGeneralQuestion({
      question: body.question,
      answer: body.answer,
      tags: body.tags ?? [],
    })
    return NextResponse.json(question, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
