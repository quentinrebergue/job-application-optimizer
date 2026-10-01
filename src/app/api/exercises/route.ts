import { NextResponse } from 'next/server'
import { listExercises, createExercise } from '@/lib/data'
import { getSessionUserId } from '@/lib/auth/session'

export async function GET() {
  const userId = await getSessionUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const exercises = await listExercises(userId)
  return NextResponse.json(exercises)
}

export async function POST(request: Request) {
  const userId = await getSessionUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await request.json() as {
      title?: string
      difficulty?: string
      knowledge_ids?: string[]
      tags?: string[]
      description?: string
      steps?: string
      code?: string
    }
    if (!body.title || !body.difficulty || !body.description) {
      return NextResponse.json(
        { error: 'Missing required fields: title, difficulty, description' },
        { status: 400 }
      )
    }
    const exercise = await createExercise(userId, {
      title: body.title,
      difficulty: body.difficulty as 'easy' | 'medium' | 'hard',
      knowledge_ids: body.knowledge_ids ?? [],
      tags: body.tags ?? [],
      description: body.description,
      steps: body.steps ?? '',
      code: body.code ?? '',
    })
    return NextResponse.json(exercise, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
