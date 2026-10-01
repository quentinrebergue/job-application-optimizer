import fs from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'

// ── Tag cleanup helper (mirrors src/lib/data/tag-cleanup.ts for MCP context) ──

const DATA_DIR = path.join(process.cwd(), 'data')
const ENTITY_TYPES = ['experiences', 'projects', 'skills', 'education'] as const

async function safeReaddir(dir: string): Promise<string[]> {
  try { return await fs.readdir(dir) } catch { return [] }
}

async function purgeTagAliases(aliases: string[]): Promise<void> {
  if (aliases.length === 0) return
  const lower = new Set(aliases.map((a) => a.toLowerCase()))
  const files: string[] = []

  for (const type of ENTITY_TYPES) {
    const dir = path.join(DATA_DIR, 'entities', type)
    for (const id of await safeReaddir(dir)) {
      if (!id.startsWith('.')) files.push(path.join(dir, id, 'meta.json'))
    }
  }
  for (const id of await safeReaddir(path.join(DATA_DIR, 'jobs'))) {
    if (id.startsWith('job-')) files.push(path.join(DATA_DIR, 'jobs', id, 'offer.json'))
  }
  for (const id of await safeReaddir(path.join(DATA_DIR, 'coding', 'exercises'))) {
    if (!id.startsWith('.')) files.push(path.join(DATA_DIR, 'coding', 'exercises', id, 'meta.json'))
  }
  for (const id of await safeReaddir(path.join(DATA_DIR, 'coding', 'knowledge'))) {
    if (!id.startsWith('.')) files.push(path.join(DATA_DIR, 'coding', 'knowledge', id, 'meta.json'))
  }
  for (const file of await safeReaddir(path.join(DATA_DIR, 'general-questions'))) {
    if (file.endsWith('.json')) files.push(path.join(DATA_DIR, 'general-questions', file))
  }

  await Promise.all(files.map(async (fp) => {
    try {
      const raw = await fs.readFile(fp, 'utf-8')
      const data = JSON.parse(raw) as Record<string, unknown>
      if (!Array.isArray(data.tags)) return
      const before = data.tags as string[]
      const after = before.filter((t) => !lower.has(t.toLowerCase()))
      if (after.length !== before.length) {
        data.tags = after
        await fs.writeFile(fp, JSON.stringify(data, null, 2))
      }
    } catch { /* skip */ }
  }))
}

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

const TREE_PATH = path.join(process.cwd(), 'data', 'taxonomy', 'tree.json')

export async function getTaxonomy(): Promise<Taxonomy> {
  const raw = await fs.readFile(TREE_PATH, 'utf-8')
  return JSON.parse(raw) as Taxonomy
}

export async function saveTaxonomy(taxonomy: Taxonomy): Promise<void> {
  await fs.mkdir(path.dirname(TREE_PATH), { recursive: true })
  await fs.writeFile(TREE_PATH, JSON.stringify(taxonomy, null, 2))
}

function getDescendants(nodeId: string, nodes: TaxonomyNode[]): string[] {
  const result: string[] = []
  const queue = [nodeId]
  while (queue.length) {
    const id = queue.shift()!
    const children = nodes.filter((n) => n.parent === id).map((n) => n.id)
    result.push(...children)
    queue.push(...children)
  }
  return result
}

export async function createTaxonomyNode(opts: {
  label: string
  parent: string | null
  aliases?: string[]
  description?: string
}): Promise<TaxonomyNode> {
  const taxonomy = await getTaxonomy()
  if (opts.parent && !taxonomy.nodes.find((n) => n.id === opts.parent)) {
    throw new Error(`Parent node "${opts.parent}" not found`)
  }
  const slug = opts.label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  const id = `${slug}-${randomUUID().slice(0, 4)}`
  const node: TaxonomyNode = {
    id,
    label: opts.label,
    parent: opts.parent,
    aliases: opts.aliases ?? [],
    ...(opts.description ? { description: opts.description } : {}),
  }
  taxonomy.nodes.push(node)
  await saveTaxonomy(taxonomy)
  return node
}

export async function updateTaxonomyNode(
  id: string,
  patch: { label?: string; parent?: string | null; description?: string }
): Promise<TaxonomyNode | null> {
  const taxonomy = await getTaxonomy()
  const idx = taxonomy.nodes.findIndex((n) => n.id === id)
  if (idx === -1) return null
  taxonomy.nodes[idx] = { ...taxonomy.nodes[idx], ...patch }
  await saveTaxonomy(taxonomy)
  return taxonomy.nodes[idx]
}

export async function deleteTaxonomyNode(id: string, cascade = false): Promise<boolean> {
  const taxonomy = await getTaxonomy()
  if (!taxonomy.nodes.find((n) => n.id === id)) return false
  const children = taxonomy.nodes.filter((n) => n.parent === id)
  if (children.length && !cascade) {
    throw new Error(`Node "${id}" has ${children.length} child(ren). Use cascade=true.`)
  }
  const toDelete = new Set(cascade ? [id, ...getDescendants(id, taxonomy.nodes)] : [id])
  const aliasesToPurge = taxonomy.nodes
    .filter((n) => toDelete.has(n.id))
    .flatMap((n) => n.aliases)
  taxonomy.nodes = taxonomy.nodes.filter((n) => !toDelete.has(n.id))
  await saveTaxonomy(taxonomy)
  await purgeTagAliases(aliasesToPurge)
  return true
}

export async function addTaxonomyAlias(nodeId: string, alias: string): Promise<TaxonomyNode | null> {
  const taxonomy = await getTaxonomy()
  const node = taxonomy.nodes.find((n) => n.id === nodeId)
  if (!node) return null
  if (!node.aliases.includes(alias)) {
    node.aliases.push(alias)
    await saveTaxonomy(taxonomy)
  }
  return node
}

export async function removeTaxonomyAlias(nodeId: string, alias: string): Promise<TaxonomyNode | null> {
  const taxonomy = await getTaxonomy()
  const node = taxonomy.nodes.find((n) => n.id === nodeId)
  if (!node) return null
  node.aliases = node.aliases.filter((a) => a !== alias)
  await saveTaxonomy(taxonomy)
  await purgeTagAliases([alias])
  return node
}

/** Resolve tags → matching node ids + all their ancestors (for entity ranking context) */
export function resolveTagsToNodes(tags: string[], nodes: TaxonomyNode[]): string[] {
  const lower = tags.map((t) => t.toLowerCase())
  const matched = new Set<string>()

  for (const node of nodes) {
    if (node.aliases.some((a) => lower.includes(a.toLowerCase()))) {
      matched.add(node.id)
      // climb ancestors
      let cur = node
      while (cur.parent) {
        matched.add(cur.parent)
        cur = nodes.find((n) => n.id === cur.parent) ?? { ...cur, parent: null }
      }
    }
  }
  return Array.from(matched)
}

/** Get all aliases in a subtree (node + descendants) */
export function getSubtreeAliases(nodeId: string, nodes: TaxonomyNode[]): string[] {
  const ids = [nodeId, ...getDescendants(nodeId, nodes)]
  return ids.flatMap((id) => nodes.find((n) => n.id === id)?.aliases ?? [])
}

// ── Tag reconciliation ─────────────────────────────────────────────────────────

function getNodePath(nodeId: string, nodes: TaxonomyNode[]): string {
  const map = new Map(nodes.map((n) => [n.id, n]))
  const segments: string[] = []
  let current = map.get(nodeId)
  while (current) {
    segments.unshift(current.label)
    current = current.parent ? map.get(current.parent) : undefined
  }
  return segments.join(' > ')
}

export type ReconcileResult = {
  matched: Array<{ tag: string; nodeId: string; label: string; path: string }>
  aliasable: Array<{ tag: string; nodeId: string; label: string; path: string; confidence: number }>
  novel: Array<{ tag: string; suggestedLabel: string; suggestedParentId?: string; suggestedParentLabel?: string }>
}

/**
 * Reconcile a list of tags against the taxonomy:
 * - Exact alias matches → "matched"
 * - Semantically close (via AI) → "aliasable" (should be added as alias)
 * - Truly novel → "novel" (should become a new node)
 *
 * Requires OPENAI_API_KEY env variable for the AI step.
 */
export async function reconcileTags(tags: string[]): Promise<ReconcileResult> {
  const { nodes } = await getTaxonomy()
  const unique = [...new Set(tags.map((t) => t.trim()).filter(Boolean))]

  type Matched = ReconcileResult['matched'][number]
  const matched: Matched[] = []
  const unmatched: string[] = []

  for (const tag of unique) {
    const directMatch = nodes.find((n) =>
      n.aliases.some((a) => a.toLowerCase() === tag.toLowerCase()) ||
      n.label.toLowerCase() === tag.toLowerCase()
    )
    if (directMatch) {
      matched.push({ tag, nodeId: directMatch.id, label: directMatch.label, path: getNodePath(directMatch.id, nodes) })
    } else {
      unmatched.push(tag)
    }
  }

  type Aliasable = ReconcileResult['aliasable'][number]
  type Novel = ReconcileResult['novel'][number]
  const aliasable: Aliasable[] = []
  let novel: Novel[] = []

  if (unmatched.length > 0) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      // No AI — treat all unmatched as novel
      novel = unmatched.map((t) => ({ tag: t, suggestedLabel: t }))
    } else {
      const { default: OpenAI } = await import('openai')
      const client = new OpenAI({ apiKey })

      const taxonomyDump = nodes
        .map((n) => `  ${n.id} | ${getNodePath(n.id, nodes)} | aliases: ${n.aliases.join(', ') || '(none)'}`)
        .join('\n')

      const prompt = `You are a taxonomy expert. Below is a tag taxonomy (node_id | full_path | aliases).

TAXONOMY:
${taxonomyDump}

UNMATCHED TAGS: ${unmatched.map((t) => `"${t}"`).join(', ')}

For each tag, decide:
- "alias": semantically equivalent to an existing node. Provide node_id and confidence 0.0–1.0.
- "novel": genuinely new concept. Suggest a label and optionally the best parent node_id.

JSON response:
{ "results": [{ "tag": "...", "decision": "alias"|"novel", "nodeId"?: "...", "confidence"?: 0.9, "suggestedLabel"?: "...", "suggestedParentId"?: "..." }] }`

      const completion = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      })

      const parsed = JSON.parse(completion.choices[0]?.message?.content ?? '{}') as {
        results?: Array<{
          tag: string; decision: string; nodeId?: string; confidence?: number
          suggestedLabel?: string; suggestedParentId?: string
        }>
      }

      for (const item of parsed.results ?? []) {
        if (item.decision === 'alias' && item.nodeId) {
          const node = nodes.find((n) => n.id === item.nodeId)
          if (node) {
            aliasable.push({ tag: item.tag, nodeId: node.id, label: node.label, path: getNodePath(node.id, nodes), confidence: item.confidence ?? 0.5 })
            continue
          }
        }
        const parentNode = item.suggestedParentId ? nodes.find((n) => n.id === item.suggestedParentId) : undefined
        novel.push({ tag: item.tag, suggestedLabel: item.suggestedLabel ?? item.tag, suggestedParentId: parentNode?.id, suggestedParentLabel: parentNode?.label })
      }
    }
  }

  return { matched, aliasable, novel }
}
