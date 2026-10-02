import { Suspense } from 'react'
import { listEntities } from '@/lib/data'
import { ENTITY_TYPE_IDS } from '@/config'
import { EntitiesClient } from '@/components/entities/EntitiesClient'
import { verifySession } from '@/lib/auth/dal'

export const dynamic = 'force-dynamic'

export default async function EntitiesPage() {
  const { userId } = await verifySession()
  const results = await Promise.all(ENTITY_TYPE_IDS.map((t) => listEntities(userId, t)))
  const entities = results.flat()
  return (
    <Suspense>
      <EntitiesClient initialEntities={entities} />
    </Suspense>
  )
}
