import { NextResponse } from 'next/server'
import { listKnowledge, createKnowledge } from '@/lib/data'

export async function GET() {
  const items = await listKnowledge()
  return NextResponse.json(items)
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { name?: string; category?: string; tags?: string[]; explanation?: string }
    if (!body.name || !body.category) {
      return NextResponse.json(
        { error: 'Missing required fields: name, category' },
        { status: 400 }
      )
    }
    const item = await createKnowledge({
      name: body.name,
      category: body.category,
      tags: body.tags ?? [],
      explanation: body.explanation ?? '',
    })
    return NextResponse.json(item, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
