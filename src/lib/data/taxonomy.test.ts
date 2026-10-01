/**
 * taxonomy.test.ts
 *
 * Tests for the pure helper functions in src/lib/data/taxonomy.ts.
 *
 * The CRUD operations (createNode, updateNode, deleteNode, addAlias,
 * removeAlias) now go through Postgres (getTaxonomy/saveTaxonomy) and
 * aren't covered here — that needs a real test database, not a unit
 * test mock. Deferred.
 */

import { describe, it, expect } from 'vitest'
import type { TaxonomyNode } from '@/types'

import {
  getAncestors,
  getDescendants,
  resolveTagsToNodes,
  getSubtreeAliases,
  getTagsFromText,
  tagsOverlap,
  getNodePath,
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

