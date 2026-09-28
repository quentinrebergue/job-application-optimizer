/**
 * taxonomy.test.ts
 *
 * Tests for src/lib/data/taxonomy.ts
 *
 * Pure helper functions are tested directly.
 * CRUD operations mock fs/promises to avoid reading the real data directory.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest'
import type { TaxonomyNode } from '@/types'

// ── In-memory fs mock ─────────────────────────────────────────────────────────

const store: Map<string, string> = new Map()

vi.mock('fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs/promises')>()
  const mocked = {
    ...actual,
    mkdir: vi.fn(async () => undefined),
    readdir: vi.fn(async (dir: unknown) => ([] as string[])),
    readFile: vi.fn(async (filePath: unknown) => {
      const p = filePath as string
      if (!store.has(p)) throw Object.assign(new Error(`ENOENT: ${p}`), { code: 'ENOENT' })
      return store.get(p)!
    }),
    writeFile: vi.fn(async (filePath: unknown, content: unknown) => {
      store.set(filePath as string, content as string)
    }),
  }
  return { ...mocked, default: mocked }
})

// ── Seed helper ───────────────────────────────────────────────────────────────

function seedTaxonomy(nodes: TaxonomyNode[]) {
  // Use the actual path that taxonomy.ts will resolve via process.cwd()
  const treePath = require('path').join(process.cwd(), 'data', 'taxonomy', 'tree.json')
  store.set(treePath, JSON.stringify({ nodes }, null, 2))
}

function readTaxonomy(): TaxonomyNode[] {
  const treePath = require('path').join(process.cwd(), 'data', 'taxonomy', 'tree.json')
  return JSON.parse(store.get(treePath)!).nodes
}

// ── Import module under test AFTER mocks ──────────────────────────────────────

import {
  getAncestors,
  getDescendants,
  resolveTagsToNodes,
  getSubtreeAliases,
  getTagsFromText,
  tagsOverlap,
  getNodePath,
  createNode,
  updateNode,
  deleteNode,
  addAlias,
  removeAlias,
} from './taxonomy'

// ── Sample nodes ──────────────────────────────────────────────────────────────

const sampleNodes: TaxonomyNode[] = [
  { id: 'hardware', label: 'Hardware', parent: null, aliases: ['hardware', 'hw'] },
  { id: 'mcu', label: 'Microcontrollers', parent: 'hardware', aliases: ['mcu', 'microcontroller'] },
  { id: 'stm32', label: 'STM32', parent: 'mcu', aliases: ['STM32', 'stm32f4'] },
  { id: 'software', label: 'Software', parent: null, aliases: ['software', 'sw'] },
  { id: 'web', label: 'Web', parent: 'software', aliases: ['web', 'frontend'] },
]

// ── Pure function tests ───────────────────────────────────────────────────────

describe('getAncestors', () => {
  it('returns all ancestors in parent→root order', () => {
    expect(getAncestors('stm32', sampleNodes)).toEqual(['mcu', 'hardware'])
  })

  it('returns empty array for root nodes', () => {
    expect(getAncestors('hardware', sampleNodes)).toEqual([])
  })

  it('returns empty array for unknown id', () => {
    expect(getAncestors('unknown', sampleNodes)).toEqual([])
  })
})

describe('getDescendants', () => {
  it('returns all descendants recursively', () => {
    const result = getDescendants('hardware', sampleNodes)
    expect(result).toContain('mcu')
    expect(result).toContain('stm32')
    expect(result).toHaveLength(2)
  })

  it('returns empty array for leaf nodes', () => {
    expect(getDescendants('stm32', sampleNodes)).toEqual([])
  })
})

describe('getNodePath', () => {
  it('builds human-readable path with > separator', () => {
    expect(getNodePath('stm32', sampleNodes)).toBe('Hardware > Microcontrollers > STM32')
  })

  it('returns just the label for root nodes', () => {
    expect(getNodePath('hardware', sampleNodes)).toBe('Hardware')
  })
})

describe('resolveTagsToNodes', () => {
  it('resolves an alias to its node and ancestors', () => {
    const result = resolveTagsToNodes(['stm32f4'], sampleNodes)
    expect(result).toContain('stm32')
    expect(result).toContain('mcu')
    expect(result).toContain('hardware')
  })

  it('is case-insensitive', () => {
    expect(resolveTagsToNodes(['STM32'], sampleNodes)).toContain('stm32')
    expect(resolveTagsToNodes(['stm32'], sampleNodes)).toContain('stm32')
  })

  it('returns empty for unknown tags', () => {
    expect(resolveTagsToNodes(['unknown-tag'], sampleNodes)).toEqual([])
  })
})

describe('getSubtreeAliases', () => {
  it('returns aliases from node and all descendants', () => {
    const result = getSubtreeAliases('hardware', sampleNodes)
    expect(result).toContain('hardware')
    expect(result).toContain('hw')
    expect(result).toContain('mcu')
    expect(result).toContain('STM32')
  })

  it('returns only self aliases for leaf node', () => {
    const result = getSubtreeAliases('stm32', sampleNodes)
    expect(result).toEqual(['STM32', 'stm32f4'])
  })
})

describe('getTagsFromText', () => {
  it('detects aliases as whole words', () => {
    const result = getTagsFromText('We use STM32 chips', sampleNodes)
    expect(result).toContain('stm32')
    expect(result).toContain('mcu')
    expect(result).toContain('hardware')
  })

  it('does not match partial words', () => {
    const result = getTagsFromText('This is about mcuberg devices', sampleNodes)
    expect(result).not.toContain('mcu')
  })

  it('returns empty array for unmatched text', () => {
    expect(getTagsFromText('nothing relevant here', sampleNodes)).toEqual([])
  })
})

describe('tagsOverlap', () => {
  it('returns true when tags share resolved nodes', () => {
    expect(tagsOverlap(['STM32'], ['stm32f4'], sampleNodes)).toBe(true)
  })

  it('returns true via ancestor matching', () => {
    // stm32 resolves to [stm32, mcu, hardware]; mcu also resolves to [mcu, hardware]
    expect(tagsOverlap(['STM32'], ['mcu'], sampleNodes)).toBe(true)
  })

  it('returns false for unrelated tags', () => {
    expect(tagsOverlap(['web'], ['STM32'], sampleNodes)).toBe(false)
  })

  it('returns false when either list is empty', () => {
    expect(tagsOverlap([], ['STM32'], sampleNodes)).toBe(false)
    expect(tagsOverlap(['STM32'], [], sampleNodes)).toBe(false)
  })
})

// ── CRUD tests (mock fs) ──────────────────────────────────────────────────────

beforeEach(() => {
  store.clear()
  vi.clearAllMocks()
  seedTaxonomy(sampleNodes)
})

describe('createNode', () => {
  it('adds a node to the taxonomy', async () => {
    const node = await createNode({ label: 'FPGA', parent: 'hardware', aliases: ['fpga'] })
    expect(node.label).toBe('FPGA')
    expect(node.parent).toBe('hardware')
    const saved = readTaxonomy()
    expect(saved.some((n) => n.label === 'FPGA')).toBe(true)
  })

  it('generates a unique id from the label', async () => {
    const node = await createNode({ label: 'Test Node', parent: null })
    expect(node.id).toMatch(/^test-node-/)
  })

  it('throws when parent does not exist', async () => {
    await expect(createNode({ label: 'X', parent: 'nonexistent' })).rejects.toThrow('Parent')
  })
})

describe('updateNode', () => {
  it('updates the label', async () => {
    const updated = await updateNode('web', { label: 'Web Development' })
    expect(updated?.label).toBe('Web Development')
    expect(readTaxonomy().find((n) => n.id === 'web')?.label).toBe('Web Development')
  })

  it('returns null for unknown id', async () => {
    expect(await updateNode('nonexistent', { label: 'X' })).toBeNull()
  })
})

describe('deleteNode', () => {
  it('removes a leaf node', async () => {
    const ok = await deleteNode('stm32')
    expect(ok).toBe(true)
    expect(readTaxonomy().find((n) => n.id === 'stm32')).toBeUndefined()
  })

  it('throws when deleting a parent without cascade', async () => {
    await expect(deleteNode('hardware')).rejects.toThrow('child')
  })

  it('deletes a node and descendants with cascade=true', async () => {
    const ok = await deleteNode('hardware', true)
    expect(ok).toBe(true)
    const nodes = readTaxonomy()
    expect(nodes.find((n) => n.id === 'hardware')).toBeUndefined()
    expect(nodes.find((n) => n.id === 'mcu')).toBeUndefined()
    expect(nodes.find((n) => n.id === 'stm32')).toBeUndefined()
  })

  it('returns false for unknown id', async () => {
    expect(await deleteNode('nonexistent')).toBe(false)
  })
})

describe('addAlias / removeAlias', () => {
  it('adds an alias to a node', async () => {
    const node = await addAlias('web', 'frontend-dev')
    expect(node?.aliases).toContain('frontend-dev')
    expect(readTaxonomy().find((n) => n.id === 'web')?.aliases).toContain('frontend-dev')
  })

  it('does not duplicate aliases', async () => {
    await addAlias('web', 'web')
    const node = readTaxonomy().find((n) => n.id === 'web')!
    expect(node.aliases.filter((a) => a === 'web')).toHaveLength(1)
  })

  it('removes an alias from a node', async () => {
    await addAlias('web', 'to-remove')
    const node = await removeAlias('web', 'to-remove')
    expect(node?.aliases).not.toContain('to-remove')
  })

  it('returns null for unknown node', async () => {
    expect(await addAlias('nonexistent', 'x')).toBeNull()
    expect(await removeAlias('nonexistent', 'x')).toBeNull()
  })
})
