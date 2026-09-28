import { NextResponse } from 'next/server'
import { createNode } from '@/lib/data'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { label, parent, aliases, description } = body as {
      label?: string; parent?: string | null; aliases?: string[]; description?: string
    }
    if (!label?.trim()) {
      return NextResponse.json({ error: 'label is required' }, { status: 400 })
    }
    const node = await createNode({ label: label.trim(), parent: parent ?? null, aliases, description })
    return NextResponse.json(node, { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to create node'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
