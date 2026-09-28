import { getEntity } from '@/lib/data'
import { notFound } from 'next/navigation'
import { ENTITY_TYPE_IDS } from '@/config'
import { EntityDetailClient } from '@/components/entities/EntityDetailClient'
import type { EntityType } from '@/types'

type Props = { params: Promise<{ type: string; id: string }> }

export default async function EntityDetailPage({ params }: Props) {
  const { type, id } = await params
  if (!ENTITY_TYPE_IDS.includes(type as EntityType)) notFound()
  const entity = await getEntity(type as EntityType, id)
  if (!entity) notFound()
  return <EntityDetailClient initialEntity={entity} />
}
