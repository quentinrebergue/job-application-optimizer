import { getTaxonomy } from '@/lib/data'
import { TaxonomyClient } from '@/components/taxonomy/TaxonomyClient'

export const dynamic = 'force-dynamic'

export default async function TaxonomyPage() {
  const taxonomy = await getTaxonomy()
  return <TaxonomyClient initialTaxonomy={taxonomy} />
}
