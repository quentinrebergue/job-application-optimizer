import { NextResponse } from 'next/server'
import { listEntities, createEntity } from '@/lib/data'
import { ENTITY_TYPE_IDS } from '@/config'
import type { EntityType } from '@/types'
import { getSessionUserId } from '@/lib/auth/session'

export async function GET(request: Request) {
  const userId = await getSessionUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') as EntityType | null

  if (type && !ENTITY_TYPE_IDS.includes(type)) {
    return NextResponse.json({ error: 'Invalid entity type' }, { status: 400 })
  }

  const types = type ? [type] : ENTITY_TYPE_IDS
  const results = await Promise.all(types.map((t) => listEntities(userId, t)))
  return NextResponse.json(results.flat())
}

export async function POST(request: Request) {
  const userId = await getSessionUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = (await request.json()) as { type?: string; [key: string]: unknown }
    const { type, ...data } = body

    if (!type || !ENTITY_TYPE_IDS.includes(type as EntityType)) {
      return NextResponse.json({ error: 'Invalid entity type' }, { status: 400 })
    }

    const entity = await createEntity(userId, type as EntityType, data as never)
    return NextResponse.json(entity, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
