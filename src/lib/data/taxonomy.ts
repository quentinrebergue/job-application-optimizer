import { pool } from '@/lib/db'
import { randomUUID } from 'crypto'
import type { Taxonomy, TaxonomyNode } from '@/types'
import { purgeTagAliases } from './tag-cleanup'

export async function getTaxonomy(userId: string): Promise<Taxonomy> {
  const { rows } = await pool.query('SELECT data FROM taxonomy WHERE user_id = $1', [userId])
  return rows[0]?.data ?? { version: 1, nodes: [] }
}

export async function saveTaxonomy(userId: string, taxonomy: Taxonomy): Promise<void> {
  await pool.query(
    `INSERT INTO taxonomy (user_id, data) VALUES ($1, $2)
     ON CONFLICT (user_id) DO UPDATE SET data = $2`,
    [userId, JSON.stringify(taxonomy)]
  )
}
// ── Tree traversal utilities ──────────────────────────────────────────────────

/** Returns all ancestor node ids (parent, grandparent, …) for a given node id */
export function getAncestors(nodeId: string, nodes: TaxonomyNode[]): string[] {
  const map = new Map(nodes.map((n) => [n.id, n]))
  const ancestors: string[] = []
  let current = map.get(nodeId)
  while (current?.parent) {
    ancestors.push(current.parent)
    current = map.get(current.parent)
  }
  return ancestors
}

/** Returns all descendant node ids (children, grandchildren, …) */
export function getDescendants(nodeId: string, nodes: TaxonomyNode[]): string[] {
  const descendants: string[] = []
  const queue = [nodeId]
  while (queue.length) {
    const id = queue.shift()!
    const children = nodes.filter((n) => n.parent === id).map((n) => n.id)
    descendants.push(...children)
    queue.push(...children)
  }
  return descendants
}

/**
 * Given a set of tag strings, returns the matching node ids (case-insensitive alias lookup).
 * Also returns all ancestor node ids so that e.g. "STM32" resolves to ["stm32","mcu","hardware"].
 */
export function resolveTagsToNodes(tags: string[], nodes: TaxonomyNode[]): string[] {
  const lower = tags.map((t) => t.toLowerCase())
  const matched = new Set<string>()

  for (const node of nodes) {
    const nodeAliases = node.aliases.map((a) => a.toLowerCase())
    if (lower.some((t) => nodeAliases.includes(t))) {
      matched.add(node.id)
      // add all ancestors
      for (const a of getAncestors(node.id, nodes)) matched.add(a)
    }
  }
  return Array.from(matched)
}

/**
 * Returns all aliases in a subtree rooted at nodeId (the node itself + all descendants).
 * Useful for "find all entities relevant to this requirement node".
 */
export function getSubtreeAliases(nodeId: string, nodes: TaxonomyNode[]): string[] {
  const ids = [nodeId, ...getDescendants(nodeId, nodes)]
  const aliases: string[] = []
  for (const id of ids) {
    const node = nodes.find((n) => n.id === id)
    if (node) aliases.push(...node.aliases)
  }
  return aliases
}

/**
 * Build a human-readable taxonomy path for a node: "Hardware & Embedded > Microcontrollers > STM32"
 */
export function getNodePath(nodeId: string, nodes: TaxonomyNode[]): string {
  const map = new Map(nodes.map((n) => [n.id, n]))
  const path: string[] = []
  let current = map.get(nodeId)
  while (current) {
    path.unshift(current.label)
    current = current.parent ? map.get(current.parent) : undefined
  }
  return path.join(' > ')
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

export async function createNode(userId: string, opts: {
  label: string
  parent: string | null
  aliases?: string[]
  description?: string
}): Promise<TaxonomyNode> {
  const taxonomy = await getTaxonomy(userId)
  if (opts.parent && !taxonomy.nodes.find((n) => n.id === opts.parent)) {
    throw new Error(`Parent node "${opts.parent}" not found`)
  }
  const id = opts.label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    + '-' + randomUUID().slice(0, 4)
  const node: TaxonomyNode = {
    id,
    label: opts.label,
    parent: opts.parent,
    aliases: opts.aliases ?? [],
    ...(opts.description ? { description: opts.description } : {}),
  }
  taxonomy.nodes.push(node)
  await saveTaxonomy(userId, taxonomy)
  return node
}

export async function updateNode(
  userId: string,
  id: string,
  patch: Partial<Pick<TaxonomyNode, 'label' | 'parent' | 'aliases' | 'description'>>
): Promise<TaxonomyNode | null> {
  const taxonomy = await getTaxonomy(userId)
  const idx = taxonomy.nodes.findIndex((n) => n.id === id)
  if (idx === -1) return null
  taxonomy.nodes[idx] = { ...taxonomy.nodes[idx], ...patch }
  await saveTaxonomy(userId, taxonomy)
  return taxonomy.nodes[idx]
}

export async function deleteNode(userId: string, id: string, cascade = false): Promise<boolean> {
  const taxonomy = await getTaxonomy(userId)
  const exists = taxonomy.nodes.find((n) => n.id === id)
  if (!exists) return false
  const children = taxonomy.nodes.filter((n) => n.parent === id)
  if (children.length > 0 && !cascade) {
    throw new Error(`Node "${id}" has ${children.length} child(ren). Pass cascade=true to delete them too.`)
  }

  const toDeleteIds = cascade ? new Set([id, ...getDescendants(id, taxonomy.nodes)]) : new Set([id])
  const aliasesToPurge = taxonomy.nodes
    .filter((n) => toDeleteIds.has(n.id))
    .flatMap((n) => n.aliases)

  if (cascade) {
    taxonomy.nodes = taxonomy.nodes.filter((n) => !toDeleteIds.has(n.id))
  } else {
    taxonomy.nodes = taxonomy.nodes.filter((n) => n.id !== id)
  }
  await saveTaxonomy(userId, taxonomy)
  await purgeTagAliases(aliasesToPurge)
  return true
}

export async function addAlias(userId: string, nodeId: string, alias: string): Promise<TaxonomyNode | null> {
  const taxonomy = await getTaxonomy(userId)
  const node = taxonomy.nodes.find((n) => n.id === nodeId)
  if (!node) return null
  if (!node.aliases.includes(alias)) {
    node.aliases.push(alias)
    await saveTaxonomy(userId, taxonomy)
  }
  return node
}

export async function removeAlias(userId: string, nodeId: string, alias: string): Promise<TaxonomyNode | null> {
  const taxonomy = await getTaxonomy(userId)
  const node = taxonomy.nodes.find((n) => n.id === nodeId)
  if (!node) return null
  node.aliases = node.aliases.filter((a) => a !== alias)
  await saveTaxonomy(userId, taxonomy)
  await purgeTagAliases([alias])
  return node
}
/**
 * Scan free-form text (job description, exercise statement, …) for any taxonomy aliases
 * that appear as whole words. Returns the matched node ids + all their ancestor ids,
 * deduplicated. Use this to auto-tag any piece of content.
 *
 * Example: text "We use Linux, C++ and FPGA" → ["linux","systems","c-cpp","languages","fpga","hardware"]
 */
export function getTagsFromText(text: string, nodes: TaxonomyNode[]): string[] {
  const lower = text.toLowerCase()
  const matched = new Set<string>()

  for (const node of nodes) {
    for (const alias of node.aliases) {
      // whole-word match: wrap alias in word-boundary-like check
      const escaped = alias.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const re = new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`, 'i')
      if (re.test(lower)) {
        matched.add(node.id)
        for (const a of getAncestors(node.id, nodes)) matched.add(a)
      }
    }
  }
  return Array.from(matched)
}

/**
 * Check whether two sets of tags overlap via taxonomy resolution.
 * Returns true if any resolved node id is shared between the two tag sets.
 * Used to determine if an exercise/question is relevant to a job.
 */
export function tagsOverlap(
  tagsA: string[],
  tagsB: string[],
  nodes: TaxonomyNode[]
): boolean {
  if (tagsA.length === 0 || tagsB.length === 0) return false
  const setA = new Set(resolveTagsToNodes(tagsA, nodes))
  const resolvedB = resolveTagsToNodes(tagsB, nodes)
  return resolvedB.some((id) => setA.has(id))
}
