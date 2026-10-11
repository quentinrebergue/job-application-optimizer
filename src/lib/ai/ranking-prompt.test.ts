import { describe, it, expect } from 'vitest'
import type { EntityMeta } from '@/types'
import { buildRankingPrompt, buildRankingSchema, normalizeRanking, type RankingLabels } from './ranking-prompt'

const exp = (id: string, title: string): EntityMeta => ({ id, type: 'experiences', title, company: 'Acme', period: '2022', description: 'd', tags: [] }) as EntityMeta
const proj = (id: string, title: string): EntityMeta => ({ id, type: 'projects', title, tech: ['C'], description: 'd', tags: [] }) as EntityMeta
const skill = (id: string, name: string, tags: string[]): EntityMeta => ({ id, type: 'skills', name, category: 'x', level: 'advanced', tags }) as EntityMeta

const LIBRARY = {
  experiences: [exp('exp-aaaa0001', 'Firmware'), exp('exp-aaaa0002', 'Web'), exp('exp-aaaa0003', 'Teaching')],
  projects: [1, 2, 3, 4, 5, 6].map((n) => proj(`proj-0000000${n}`, `Project ${n}`)),
  skills: [skill('skil-1', 'Languages', ['C', 'C++', 'Python']), skill('skil-2', 'Embedded', ['RTOS', 'CAN']), skill('skil-3', 'Web', ['React'])],
}

describe('buildRankingPrompt', () => {
  const { prompt, labels } = buildRankingPrompt('Dev', 'Acme', 'Build things', LIBRARY)

  it('asks for one JSON object and carries the offer', () => {
    expect(prompt).toContain('One JSON object')
    expect(prompt).toContain('Title: Dev')
    expect(prompt).toContain('Company: Acme')
  })

  it('gives every entry a short label and never shows a real id', () => {
    expect(prompt).toContain('E1. Firmware at Acme')
    expect(prompt).toContain('P6. Project 6')
    expect(prompt).toContain('S3. Web, advanced. Tags: 1 React')
    expect(prompt).not.toMatch(/exp-aaaa|proj-0000|skil-/)
    expect(labels.get('E2')?.entity.id).toBe('exp-aaaa0002')
    expect(labels.size).toBe(3 + 6 + 3)
  })

  it('numbers the tags of each skill so the AI can answer with numbers', () => {
    expect(prompt).toContain('S1. Languages, advanced. Tags: 1 C, 2 C++, 3 Python')
  })

  it('shows the answer minified on one line, and asks for it, so the AI does not pay for indentation', () => {
    expect(prompt).toContain('minified on a single line')
    expect(prompt).toMatch(/\n\{"ats_tags":\["keyword"\],"levels":\{"E1":3,[^\n]+\}\n/)
  })

  it('cleans the offer only when asked to', () => {
    const offer = 'You will write C.\n\nBenefits:\n- Free lunch'
    expect(buildRankingPrompt('Dev', 'Acme', offer, LIBRARY).prompt).toContain('Free lunch')
    const cleaned = buildRankingPrompt('Dev', 'Acme', offer, LIBRARY, { cleanOffer: 'code' })
    expect(cleaned.prompt).toContain('You will write C.')
    expect(cleaned.prompt).not.toContain('Free lunch')
    expect(cleaned.parts.offer.length).toBeLessThan(buildRankingPrompt('Dev', 'Acme', offer, LIBRARY).parts.offer.length)
  })

  it('contains nothing about a specific person', () => {
    for (const personal of ['EPITA', 'TOEIC', 'watchmaking', 'GISTRE']) expect(prompt).not.toContain(personal)
  })

  it('stays short: the fixed part is a few hundred tokens', () => {
    const empty = buildRankingPrompt('T', 'C', 'D', { experiences: [], projects: [], skills: [] }).prompt
    expect(empty.length / 4).toBeLessThan(700)
  })
})

describe('normalizeRanking', () => {
  const labels: RankingLabels = buildRankingPrompt('Dev', 'Acme', 'x', LIBRARY).labels
  const normalize = (data: unknown) => normalizeRanking(data, labels)
  /** levels for E1.., P1.., S1.. in order, from three lists of levels */
  const levelsOf = (e: number[], p: number[], s: number[]) =>
    Object.fromEntries([...e.map((l, i) => [`E${i + 1}`, l]), ...p.map((l, i) => [`P${i + 1}`, l]), ...s.map((l, i) => [`S${i + 1}`, l])])
  const best = (experiences: string[], projects: string[], skills: string[]) => ({
    experiences: experiences.map((id) => ({ id, why: 'matches' })),
    projects: projects.map((id) => ({ id, why: 'matches' })),
    skills: skills.map((id) => ({ id, why: 'matches' })),
  })
  const FULL = levelsOf([3, 1, 2], [3, 3, 3, 2, 2, 2], [3, 2, 0])

  it('refuses an answer that is not a JSON object', () => {
    for (const bad of [null, 'text', 42, ['a']]) expect(() => normalize(bad)).toThrow('not a JSON object')
  })

  it('maps labels back to real ids and recommends the good ones within the limits', () => {
    const { analysis, diagnostics } = normalize({
      ats_tags: ['C', 'RTOS'],
      levels: FULL,
      best: best(['E1', 'E3'], ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'], ['S1', 'S2']),
    })
    expect(analysis.recommended_experience_ids).toEqual(['exp-aaaa0001', 'exp-aaaa0003'])
    expect(analysis.recommended_project_ids).toHaveLength(5) // the maximum, best first
    expect(analysis.recommended_project_ids.slice(0, 3)).toEqual(['proj-00000001', 'proj-00000002', 'proj-00000003'])
    expect(analysis.recommended_skill_ids).toEqual(['skil-1', 'skil-2'])
    expect(analysis.ats_tags).toEqual(['C', 'RTOS'])
    expect(diagnostics).toEqual({ invalidIds: 0, unrated: 0 })
  })

  it('orders by level, then by the AI order among its best, then by the library', () => {
    const { analysis } = normalize({
      levels: levelsOf([3, 3, 3], [], []),
      best: best(['E3', 'E1'], [], []), // E2 is level 3 but not in "best": it comes after
    })
    expect(analysis.entities_by_type.experiences.map((e) => [e.id, e.level, e.rank])).toEqual([
      ['exp-aaaa0003', 3, 1],
      ['exp-aaaa0001', 3, 2],
      ['exp-aaaa0002', 3, 3],
    ])
  })

  it('keeps the reason of the best entries only', () => {
    const { analysis } = normalize({ levels: levelsOf([3, 3, 0], [], []), best: { experiences: [{ id: 'E1', why: 'C++ firmware' }] } })
    const reasons = Object.fromEntries(analysis.entities_by_type.experiences.map((e) => [e.id, e.reason]))
    expect(reasons).toEqual({ 'exp-aaaa0001': 'C++ firmware', 'exp-aaaa0002': '', 'exp-aaaa0003': '' })
  })

  it('tops up with weak entries to reach the minimum, never with unrelated ones', () => {
    const { analysis } = normalize({ levels: levelsOf([2, 1, 0], [1, 0, 0, 0, 0, 0], [3, 3, 3]) })
    expect(analysis.recommended_experience_ids).toEqual(['exp-aaaa0001', 'exp-aaaa0002'])
    expect(analysis.recommended_project_ids).toEqual(['proj-00000001']) // only one entry is above level 0
  })

  it('drops invented, misplaced and badly rated labels and counts them', () => {
    const { analysis, diagnostics } = normalize({
      levels: { ...levelsOf([3, 3], [], []), E9: 3, E3: 7 }, // E9 unknown, E3 level 7 (E3 stays unrated)
      best: { experiences: [{ id: 'E1' }, { id: 'P1' }, { id: 'E7' }, { id: 'E1' }] }, // P1 wrong type, E7 unknown, E1 twice
    })
    expect(analysis.entities_by_type.experiences.map((e) => e.id)).toEqual(['exp-aaaa0001', 'exp-aaaa0002'])
    expect(diagnostics.invalidIds).toBe(4) // E9, E3=7, P1, E7
    expect(diagnostics.unrated).toBe(1 + 6 + 3) // E3, then every project and skill
  })

  it('accepts a label in lower case', () => {
    expect(normalize({ levels: { e1: 3 }, best: { experiences: [{ id: 'e1' }] } }).analysis.recommended_experience_ids).toEqual(['exp-aaaa0001'])
  })

  it('also reads a plain label in "best"', () => {
    expect(normalize({ levels: { E1: 3 }, best: { experiences: ['E1'] } }).analysis.recommended_experience_ids).toEqual(['exp-aaaa0001'])
  })

  it('reads the tags of a skill by number and only keeps those of the skill', () => {
    const { analysis } = normalize({
      levels: levelsOf([], [], [3, 3, 3]),
      best: {
        skills: [
          { id: 'S1', tags: [1, '3', 9, 0] }, // 9 and 0 are not tags of S1; "3" is read as 3
          { id: 'S2', tags: [1, 2] }, // every tag: no narrowing
        ],
      },
    })
    expect(analysis.recommended_skill_tags).toEqual({ 'skil-1': ['C', 'Python'] })
  })

  it('also accepts a tag written out, whatever its case', () => {
    const { analysis } = normalize({ levels: levelsOf([], [], [3]), best: { skills: [{ id: 'S1', tags: ['c', 'python', 'Cobol'] }] } })
    expect(analysis.recommended_skill_tags).toEqual({ 'skil-1': ['C', 'Python'] })
  })

  it('suggests tags to add, only to a skill of the library and only new ones', () => {
    const { analysis } = normalize({
      levels: levelsOf([], [], [3, 3, 3]),
      new_skill_tags: [
        { skill: 'S1', tag: 'Rust' },
        { skill: 'S1', tag: 'python' }, // already a tag
        { skill: 'E1', tag: 'x' }, // not a skill
        { skill: 'S9', tag: 'x' }, // unknown
        { skill: 'S2', tag: '' },
      ],
    })
    expect(analysis.suggested_new_skill_tags).toEqual([{ skill_id: 'skil-1', tag: 'Rust', reason: '' }])
    expect(analysis.suggested_new_skills).toEqual([])
  })

  it('answers with empty lists when the library is empty', () => {
    const none = buildRankingPrompt('T', 'C', 'D', { experiences: [], projects: [], skills: [] }).labels
    const { analysis } = normalizeRanking({ ats_tags: ['x'], levels: {}, best: {} }, none)
    expect(analysis.recommended_project_ids).toEqual([])
    expect(analysis.entities_by_type.education).toEqual([])
  })
})

describe('buildRankingSchema', () => {
  const labels = buildRankingPrompt('Dev', 'Acme', 'x', LIBRARY).labels
  const schema = buildRankingSchema(labels) as any // eslint-disable-line @typescript-eslint/no-explicit-any

  it('requires a level from 0 to 3 for every label of this library', () => {
    expect(schema.properties.levels.required).toEqual(['E1', 'E2', 'E3', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'S1', 'S2', 'S3'])
    expect(schema.properties.levels.properties.P4).toEqual({ enum: [0, 1, 2, 3] })
    expect(schema.properties.levels.additionalProperties).toBe(false)
  })

  it('lets "best" name only the labels of the right type: reasons for experiences and projects, tag numbers for skills', () => {
    const best = schema.properties.best.properties
    expect(best.experiences.items.properties.id.enum).toEqual(['E1', 'E2', 'E3'])
    expect(best.projects.items.properties.id.enum).toEqual(['P1', 'P2', 'P3', 'P4', 'P5', 'P6'])
    expect(best.skills.items.properties.id.enum).toEqual(['S1', 'S2', 'S3'])
    expect(best.skills.items.properties.tags.items).toEqual({ type: 'integer' })
    expect(best.skills.items.properties.why).toBeUndefined()
    expect(best.experiences.items.properties.tags).toBeUndefined()
  })

  it('requires every part of the answer and nothing else', () => {
    expect(schema.required).toEqual(['ats_tags', 'levels', 'best', 'new_skill_tags'])
    expect(schema.additionalProperties).toBe(false)
  })

  it('stays free of counts and text lengths, which slow the model server down', () => {
    const json = JSON.stringify(schema)
    expect(json).not.toMatch(/minItems|maxLength|uniqueItems/)
  })

  it('suggests a tag only for a skill of this library', () => {
    expect(schema.properties.new_skill_tags.items.properties.skill.enum).toEqual(['S1', 'S2', 'S3'])
    expect(schema.properties.new_skill_tags.items.properties.reason).toBeUndefined()
    expect(schema.properties.new_skills).toBeUndefined()
  })

  it('allows no entry at all for an empty type instead of an empty enum', () => {
    const none = buildRankingSchema(buildRankingPrompt('T', 'C', 'D', { experiences: [], projects: [], skills: [] }).labels) as any // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(none.properties.best.properties.experiences).toEqual({ type: 'array', maxItems: 0 })
    expect(none.properties.new_skill_tags).toEqual({ type: 'array', maxItems: 0 })
  })

  it('stays small for a big library', () => {
    const big = { experiences: [], projects: Array.from({ length: 20 }, (_, i) => proj(`p${i}`, `P${i}`)), skills: [] }
    expect(JSON.stringify(buildRankingSchema(buildRankingPrompt('T', 'C', 'D', big).labels)).length).toBeLessThan(8000)
  })
})

describe('entry sizes (#185)', () => {
  it('reports the size of each entry line, so a check can name the biggest', () => {
    const library = { experiences: [{ ...exp('exp-1', 'Firmware'), description: 'x'.repeat(900) }], projects: [proj('proj-1', 'Queue')], skills: [] }
    const { sizes, prompt } = buildRankingPrompt('Dev', 'Acme', 'o', library)
    expect(Object.keys(sizes)).toEqual(['E1', 'P1'])
    expect(sizes.E1).toBeGreaterThan(900)
    expect(sizes.P1).toBeLessThan(100)
    // Nothing is cut: the AI reads the whole description
    expect(prompt).toContain('x'.repeat(900))
    expect(prompt).not.toContain('…')
  })
})
