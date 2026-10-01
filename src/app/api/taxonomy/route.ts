import { NextResponse } from 'next/server'
import { getTaxonomy, saveTaxonomy } from '@/lib/data'
import { getSessionUserId } from '@/lib/auth/session'

export async function GET() {
  const userId = await getSessionUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const taxonomy = await getTaxonomy(userId)
  return NextResponse.json(taxonomy)
}

export async function PUT(request: Request) {
  const userId = await getSessionUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await request.json()
    if (!body?.nodes || !Array.isArray(body.nodes)) {
      return NextResponse.json({ error: 'Invalid taxonomy: nodes array required' }, { status: 400 })
    }
    await saveTaxonomy(userId, body)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
