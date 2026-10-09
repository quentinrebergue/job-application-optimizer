import { NextResponse } from 'next/server'
import { getEntity, updateEntity, deleteEntity } from '@/lib/data'
import { ENTITY_TYPE_IDS } from '@/config'
import type { EntityType } from '@/types'
import { getSessionUserId } from '@/lib/auth/session'
import { EntityUpdateSchemas } from '@/schemas/inputs'
import { readJson } from '@/lib/validation/read-json'

type Params = Promise<{ type: string; id: string }>

export async function GET(_req: Request, { params }: { params: Params }) {
  const userId = await getSessionUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { type, id } = await params
  if (!ENTITY_TYPE_IDS.includes(type as EntityType)) {
    return NextResponse.json({ error: 'Invalid entity type' }, { status: 400 })
  }
  const entity = await getEntity(userId, type as EntityType, id)
  if (!entity) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(entity)
}

export async function PUT(req: Request, { params }: { params: Params }) {
  const userId = await getSessionUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { type, id } = await params
  if (!ENTITY_TYPE_IDS.includes(type as EntityType)) {
    return NextResponse.json({ error: 'Invalid entity type' }, { status: 400 })
  }
  const body = await readJson(req, EntityUpdateSchemas[type as EntityType])
  if (!body.ok) return body.response
  const updated = await updateEntity(userId, type as EntityType, id, body.data as never)
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(updated)
}

export async function DELETE(_req: Request, { params }: { params: Params }) {
  const userId = await getSessionUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { type, id } = await params
  if (!ENTITY_TYPE_IDS.includes(type as EntityType)) {
    return NextResponse.json({ error: 'Invalid entity type' }, { status: 400 })
  }
  const ok = await deleteEntity(userId, type as EntityType, id)
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return new NextResponse(null, { status: 204 })
}
