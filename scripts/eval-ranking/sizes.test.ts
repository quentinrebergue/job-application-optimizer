import { describe, it, expect } from 'vitest'
import type { EntityMeta } from '@/types'
import type { EvalCase } from './cases'
import { formatSizes, measureSizes, percentile } from './sizes'

const exp = (n: number): EntityMeta => ({ id: `exp-${n}`, type: 'experiences', title: `Job ${n}`, company: 'Acme', period: '2022', description: 'é'.repeat(50), tags: [] }) as EntityMeta

const makeCase = (name: string, offer: string, experiences: number): EvalCase => ({
  name,
  source: 'private',
  job: { title: 'Dev', company: 'Acme', description: offer },
  entities: { experiences: Array.from({ length: experiences }, (_, i) => exp(i + 1)), projects: [], skills: [], education: [] },
  expected: { experiences: [], projects: [], skills: [] },
})

describe('measureSizes', () => {
  const [small, big] = measureSizes([makeCase('small', 'short offer', 1), makeCase('big', 'x'.repeat(1000), 5)])

  it('grows with the offer and with the library', () => {
    expect(big.offer).toBeGreaterThan(small.offer)
    expect(big.library).toBeGreaterThan(small.library)
    expect(big.total).toBeGreaterThan(small.total)
  })

  it('counts characters, as the gateway does, not bytes', () => {
    const [row] = measureSizes([makeCase('accents', 'é'.repeat(300), 0)])
    // The offer part holds the 300 accented letters plus its title and company lines: far under 600 bytes of "é".
    expect(row.offer).toBeLessThan(400)
    expect(row.offer).toBeGreaterThanOrEqual(300)
  })

  it('has the instructions in the total and the schema outside of it', () => {
    expect(small.instructions).toBeGreaterThan(0)
    expect(small.total).toBeGreaterThanOrEqual(small.instructions + small.library + small.offer)
    expect(small.schema).toBeGreaterThan(0)
  })

  it('has no schema when the answer is not held to one', () => {
    expect(measureSizes([makeCase('a', 'o', 1)], { schema: false })[0].schema).toBe(0)
    expect(measureSizes([makeCase('a', 'o', 1)], { answerFormat: 'yaml' })[0].schema).toBe(0)
  })
})

describe('percentile', () => {
  it('takes the nearest rank', () => {
    expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.5)).toBe(5)
    expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.9)).toBe(9)
    expect(percentile([7], 0.9)).toBe(7)
    expect(percentile([], 0.5)).toBe(0)
  })
})

describe('formatSizes', () => {
  const text = formatSizes(measureSizes([makeCase('small', 'o', 1), makeCase('big', 'x'.repeat(1000), 5)]))

  it('lists the biggest case first, then the spread', () => {
    expect(text.indexOf('big')).toBeLessThan(text.indexOf('small'))
    for (const label of ['min', 'median', 'p90', 'max']) expect(text).toContain(label)
  })

  it('says what the total is', () => {
    expect(text).toContain('MAX_PROMPT_CHARS')
    expect(text).toContain('2 cases')
  })
})
