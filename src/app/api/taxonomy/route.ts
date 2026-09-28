import { NextResponse } from 'next/server'
import { getTaxonomy, saveTaxonomy } from '@/lib/data'

export async function GET() {
  const taxonomy = await getTaxonomy()
  return NextResponse.json(taxonomy)
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    if (!body?.nodes || !Array.isArray(body.nodes)) {
      return NextResponse.json({ error: 'Invalid taxonomy: nodes array required' }, { status: 400 })
    }
    await saveTaxonomy(body)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
