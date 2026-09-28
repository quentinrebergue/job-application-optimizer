import { NextResponse } from 'next/server'
import { listEntities, createEntity } from '@/lib/data'
import { ENTITY_TYPE_IDS } from '@/config'
import type { EntityType } from '@/types'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') as EntityType | null

  if (type && !ENTITY_TYPE_IDS.includes(type)) {
    return NextResponse.json({ error: 'Invalid entity type' }, { status: 400 })
  }

  const types = type ? [type] : ENTITY_TYPE_IDS
  const results = await Promise.all(types.map((t) => listEntities(t)))
  return NextResponse.json(results.flat())
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { type?: string; [key: string]: unknown }
    const { type, ...data } = body

    if (!type || !ENTITY_TYPE_IDS.includes(type as EntityType)) {
      return NextResponse.json({ error: 'Invalid entity type' }, { status: 400 })
    }

    const entity = await createEntity(type as EntityType, data as never)
    return NextResponse.json(entity, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
