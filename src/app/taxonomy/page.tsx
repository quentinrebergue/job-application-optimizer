import { getTaxonomy } from '@/lib/data'
import { TaxonomyClient } from '@/components/taxonomy/TaxonomyClient'
import { verifySession } from '@/lib/auth/dal'

export const dynamic = 'force-dynamic'

export default async function TaxonomyPage() {
  const { userId } = await verifySession()
  const taxonomy = await getTaxonomy(userId)
  return <TaxonomyClient initialTaxonomy={taxonomy} />
}
