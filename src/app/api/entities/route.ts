import { NextResponse } from 'next/server'
import { listEntities, createEntity, countEntities } from '@/lib/data'
import { capReached, consumeCreation } from '@/lib/quotas'
import { MAX_ENTRIES } from '@/config/limits'
import { ENTITY_TYPE_IDS, getEntityTypeConfig } from '@/config'
import type { EntityType } from '@/types'
import { getSessionUserId } from '@/lib/auth/session'
import { EntityCreateSchema } from '@/schemas/inputs'
import { readJson } from '@/lib/validation/read-json'

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
  const body = await readJson(request, EntityCreateSchema)
  if (!body.ok) return body.response

  const { type, ...data } = body.data
  if ((await countEntities(userId, type)) >= MAX_ENTRIES[type]) {
    return capReached(MAX_ENTRIES[type], getEntityTypeConfig(type).label.toLowerCase())
  }
  const limited = await consumeCreation(userId, 'entity')
  if (limited) return limited
  // A failure past this point is ours, not the request's.
  try {
    const entity = await createEntity(userId, type, data as never)
    return NextResponse.json(entity, { status: 201 })
  } catch (err) {
    console.error('create entity failed', err)
    return NextResponse.json({ error: 'The entry could not be saved. Try again.' }, { status: 500 })
  }
}
