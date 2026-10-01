import { getEntity } from '@/lib/data'
import { notFound } from 'next/navigation'
import { ENTITY_TYPE_IDS } from '@/config'
import { EntityDetailClient } from '@/components/entities/EntityDetailClient'
import type { EntityType } from '@/types'
import { verifySession } from '@/lib/auth/dal'

type Props = { params: Promise<{ type: string; id: string }> }

export const dynamic = 'force-dynamic'

export default async function EntityDetailPage({ params }: Props) {
  const { userId } = await verifySession()
  const { type, id } = await params
  if (!ENTITY_TYPE_IDS.includes(type as EntityType)) notFound()
  const entity = await getEntity(userId, type as EntityType, id)
  if (!entity) notFound()
  return <EntityDetailClient initialEntity={entity} />
}
