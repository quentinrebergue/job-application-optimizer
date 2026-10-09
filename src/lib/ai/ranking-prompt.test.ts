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
    expect(prompt).toContain('S3. Web, advanced')
    expect(prompt).not.toMatch(/exp-aaaa|proj-0000|skil-/)
    expect(labels.get('E2')?.entity.id).toBe('exp-aaaa0002')
    expect(labels.size).toBe(3 + 6 + 3)
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
  const rate = (prefix: string, levels: number[]) => levels.map((level, i) => ({ id: `${prefix}${i + 1}`, level, why: level >= 2 ? 'matches' : undefined }))

  it('refuses an answer that is not a JSON object', () => {
    for (const bad of [null, 'text', 42, ['a']]) expect(() => normalize(bad)).toThrow('not a JSON object')
  })

  it('maps labels back to real ids and recommends the good ones within the limits', () => {
    const { analysis, diagnostics } = normalize({
      ats_tags: ['C', 'RTOS'],
      experiences: rate('E', [3, 1, 2]),
      projects: rate('P', [3, 3, 3, 2, 2, 2]),
      skills: rate('S', [3, 2, 0]),
    })
    expect(analysis.recommended_experience_ids).toEqual(['exp-aaaa0001', 'exp-aaaa0003'])
    expect(analysis.recommended_project_ids).toHaveLength(5) // the maximum, best first
    expect(analysis.recommended_project_ids.slice(0, 3)).toEqual(['proj-00000001', 'proj-00000002', 'proj-00000003'])
    expect(analysis.recommended_skill_ids).toEqual(['skil-1', 'skil-2'])
    expect(analysis.ats_tags).toEqual(['C', 'RTOS'])
    expect(diagnostics).toEqual({ invalidIds: 0, unrated: 0 })
  })

  it('orders each list by level, keeping the AI order within a level', () => {
    const { analysis } = normalize({ experiences: [{ id: 'E2', level: 1 }, { id: 'E3', level: 3 }, { id: 'E1', level: 3 }] })
    expect(analysis.entities_by_type.experiences.map((e) => [e.id, e.rank])).toEqual([['exp-aaaa0003', 1], ['exp-aaaa0001', 2], ['exp-aaaa0002', 3]])
  })

  it('tops up with weak entries to reach the minimum, never with unrelated ones', () => {
    const { analysis } = normalize({ experiences: rate('E', [2, 1, 0]), projects: rate('P', [1, 0, 0, 0, 0, 0]) })
    expect(analysis.recommended_experience_ids).toEqual(['exp-aaaa0001', 'exp-aaaa0002'])
    expect(analysis.recommended_project_ids).toEqual(['proj-00000001']) // only one entry is above level 0
  })

  it('drops invented, misplaced and badly rated labels and counts them', () => {
    const { analysis, diagnostics } = normalize({
      experiences: [{ id: 'E1', level: 3 }, { id: 'E9', level: 3 }, { id: 'P1', level: 3 }, { id: 'E2', level: 7 }, { id: 'E1', level: 0 }],
    })
    expect(analysis.entities_by_type.experiences.map((e) => e.id)).toEqual(['exp-aaaa0001'])
    expect(diagnostics.invalidIds).toBe(3) // E9 (unknown), P1 (wrong type), E2 (level 7)
    expect(diagnostics.unrated).toBe(2 + 6 + 3) // E2 and E3, then every project and skill
  })

  it('accepts a label in lower case', () => {
    expect(normalize({ experiences: [{ id: 'e1', level: 3 }] }).analysis.recommended_experience_ids).toEqual(['exp-aaaa0001'])
  })

  it('keeps only the tags that belong to the skill, and only when they narrow it', () => {
    const { analysis } = normalize({
      skills: [
        { id: 'S1', level: 3, tags: ['c', 'python', 'Cobol'] }, // "c" matches "C" whatever the case; Cobol is not a tag
        { id: 'S2', level: 3, tags: ['RTOS', 'CAN'] }, // every tag: no narrowing
      ],
    })
    expect(analysis.recommended_skill_tags).toEqual({ 'skil-1': ['C', 'Python'] })
  })

  it('validates the suggestions', () => {
    const { analysis } = normalize({
      skills: rate('S', [3, 3, 3]),
      new_skills: [
        { name: 'Rust', category: 'Languages', level: 'wizard', tags: ['memory safety'], reason: 'asked' },
        { name: 'languages', category: 'x', reason: 'already there' }, // same name as an existing skill
        { category: 'no name' },
        'junk',
      ],
      new_skill_tags: [
        { skill: 'S1', tag: 'Rust', reason: 'asked' },
        { skill: 'S1', tag: 'python', reason: 'already a tag' },
        { skill: 'E1', tag: 'x', reason: 'not a skill' },
        { skill: 'S9', tag: 'x', reason: 'unknown' },
      ],
    })
    expect(analysis.suggested_new_skills).toEqual([{ name: 'Rust', category: 'Languages', level: 'intermediate', tags: ['memory safety'], reason: 'asked' }])
    expect(analysis.suggested_new_skill_tags).toEqual([{ skill_id: 'skil-1', tag: 'Rust', reason: 'asked' }])
  })

  it('answers with empty lists when the library is empty', () => {
    const none = buildRankingPrompt('T', 'C', 'D', { experiences: [], projects: [], skills: [] }).labels
    const { analysis } = normalizeRanking({ ats_tags: ['x'] }, none)
    expect(analysis.recommended_project_ids).toEqual([])
    expect(analysis.entities_by_type.education).toEqual([])
  })
})

describe('buildRankingSchema', () => {
  const labels = buildRankingPrompt('Dev', 'Acme', 'x', LIBRARY).labels
  const schema = buildRankingSchema(labels) as any // eslint-disable-line @typescript-eslint/no-explicit-any

  it('allows only the labels of this library, and no count or length that would slow the model server down', () => {
    expect(schema.properties.experiences.minItems).toBeUndefined()
    expect(schema.properties.experiences.maxItems).toBeUndefined()
    expect(schema.properties.experiences.items.properties.why.maxLength).toBeUndefined()
    expect(schema.properties.experiences.items.properties.id.enum).toEqual(['E1', 'E2', 'E3'])
    expect(schema.properties.projects.items.properties.id.enum).toEqual(['P1', 'P2', 'P3', 'P4', 'P5', 'P6'])
    expect(schema.properties.skills.items.properties.id.enum).toEqual(['S1', 'S2', 'S3'])
    expect(schema.properties.skills.items.properties.tags).toBeDefined()
    expect(schema.properties.experiences.items.properties.tags).toBeUndefined()
  })

  it('allows only the levels 0 to 3 and requires every top-level list', () => {
    expect(schema.properties.projects.items.properties.level.enum).toEqual([0, 1, 2, 3])
    expect(schema.required).toEqual(['ats_tags', 'experiences', 'projects', 'skills', 'new_skills', 'new_skill_tags'])
    expect(schema.additionalProperties).toBe(false)
  })

  it('suggests a tag only for a skill of this library', () => {
    expect(schema.properties.new_skill_tags.items.properties.skill.enum).toEqual(['S1', 'S2', 'S3'])
  })

  it('allows no entry at all for an empty type instead of an empty enum', () => {
    const none = buildRankingSchema(buildRankingPrompt('T', 'C', 'D', { experiences: [], projects: [], skills: [] }).labels) as any // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(none.properties.experiences).toEqual({ type: 'array', maxItems: 0 })
    expect(none.properties.new_skill_tags).toEqual({ type: 'array', maxItems: 0 })
  })

  it('stays small for a big library', () => {
    const big = { experiences: [], projects: Array.from({ length: 20 }, (_, i) => proj(`p${i}`, `P${i}`)), skills: [] }
    expect(JSON.stringify(buildRankingSchema(buildRankingPrompt('T', 'C', 'D', big).labels)).length).toBeLessThan(8000)
  })
})
