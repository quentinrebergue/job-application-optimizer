export interface TaxonomyNode {
  id: string
  label: string
  parent: string | null
  aliases: string[]
  description?: string
}

export interface Taxonomy {
  version: number
  nodes: TaxonomyNode[]
}
