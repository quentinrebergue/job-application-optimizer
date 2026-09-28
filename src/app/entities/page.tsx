import { listEntities } from '@/lib/data'
import { ENTITY_TYPE_IDS } from '@/config'
import { EntitiesClient } from '@/components/entities/EntitiesClient'

export default async function EntitiesPage() {
  const results = await Promise.all(ENTITY_TYPE_IDS.map((t) => listEntities(t)))
  const entities = results.flat()
  return <EntitiesClient initialEntities={entities} />
}
