import { NextResponse } from 'next/server'
import { listSentences, createSentence } from '@/lib/data/cover-letter'
import { getSessionUserId } from '@/lib/auth/session'

export async function GET() {
  const userId = await getSessionUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const sentences = await listSentences(userId)
  return NextResponse.json(sentences)
}

export async function POST(req: Request) {
  const userId = await getSessionUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await req.json() as { text: string; category: string; tags?: string[] }
  if (!body.text?.trim() || !body.category) {
    return NextResponse.json({ error: 'text and category are required' }, { status: 400 })
  }
  const sentence = await createSentence(userId, {
    text: body.text.trim(),
    category: body.category as never,
    tags: body.tags ?? [],
  })
  return NextResponse.json(sentence, { status: 201 })
}
