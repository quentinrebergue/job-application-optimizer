import { NextResponse } from 'next/server'
import { getEntity, updateEntity, deleteEntity } from '@/lib/data'
import { ENTITY_TYPE_IDS } from '@/config'
import type { EntityType } from '@/types'

type Params = Promise<{ type: string; id: string }>

export async function GET(_req: Request, { params }: { params: Params }) {
  const { type, id } = await params
  if (!ENTITY_TYPE_IDS.includes(type as EntityType)) {
    return NextResponse.json({ error: 'Invalid entity type' }, { status: 400 })
  }
  const entity = await getEntity(type as EntityType, id)
  if (!entity) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(entity)
}

export async function PUT(req: Request, { params }: { params: Params }) {
  const { type, id } = await params
  if (!ENTITY_TYPE_IDS.includes(type as EntityType)) {
    return NextResponse.json({ error: 'Invalid entity type' }, { status: 400 })
  }
  try {
    const body = (await req.json()) as Record<string, unknown>
    const updated = await updateEntity(type as EntityType, id, body as never)
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Params }) {
  const { type, id } = await params
  if (!ENTITY_TYPE_IDS.includes(type as EntityType)) {
    return NextResponse.json({ error: 'Invalid entity type' }, { status: 400 })
  }
  const ok = await deleteEntity(type as EntityType, id)
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return new NextResponse(null, { status: 204 })
}
