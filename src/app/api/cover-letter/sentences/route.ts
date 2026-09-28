import { NextResponse } from 'next/server'
import { listSentences, createSentence } from '@/lib/data/cover-letter'

export async function GET() {
  const sentences = await listSentences()
  return NextResponse.json(sentences)
}

export async function POST(req: Request) {
  const body = await req.json() as { text: string; category: string; tags?: string[] }
  if (!body.text?.trim() || !body.category) {
    return NextResponse.json({ error: 'text and category are required' }, { status: 400 })
  }
  const sentence = await createSentence({
    text: body.text.trim(),
    category: body.category as never,
    tags: body.tags ?? [],
  })
  return NextResponse.json(sentence, { status: 201 })
}
