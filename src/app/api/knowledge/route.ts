import { NextResponse } from 'next/server'
import { listKnowledge, createKnowledge } from '@/lib/data'
import { getSessionUserId } from '@/lib/auth/session'

export async function GET() {
  const userId = await getSessionUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const items = await listKnowledge(userId)
  return NextResponse.json(items)
}

export async function POST(request: Request) {
  const userId = await getSessionUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await request.json() as { name?: string; category?: string; tags?: string[]; explanation?: string }
    if (!body.name || !body.category) {
      return NextResponse.json(
        { error: 'Missing required fields: name, category' },
        { status: 400 }
      )
    }
    const item = await createKnowledge(userId, {
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
