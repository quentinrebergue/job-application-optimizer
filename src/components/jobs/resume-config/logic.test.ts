import { describe, it, expect } from 'vitest'
import type { EntityMeta, ResumeConfig } from '@/types'
import type { AIAnalysisResult } from '@/types/job'
import {
  EMPTY_CONFIG, applyAiOrder, entitySubLabel, groupEntities, initialConfig, moveEntity, parseEndDate,
  resetConfig, setDescription, toggleEntity, toggleSkillTag,
} from './logic'

const exp = (id: string, period: string): EntityMeta =>
  ({ id, type: 'experiences', title: id, company: 'Co', period, description: `${id} desc`, tags: [] }) as EntityMeta
const proj = (id: string): EntityMeta =>
  ({ id, type: 'projects', title: id, tech: [], description: '', tags: [] }) as EntityMeta
const skill = (id: string, tags: string[]): EntityMeta =>
  ({ id, type: 'skills', name: id, category: 'c', level: 'advanced', tags }) as EntityMeta
const edu = (id: string, period: string): EntityMeta =>
  ({ id, type: 'education', degree: id, institution: 'U', period, tags: [] }) as EntityMeta

const cfg = (patch: Partial<ResumeConfig> = {}): ResumeConfig => ({ ...EMPTY_CONFIG, ...patch })

describe('entitySubLabel', () => {
  it('shows where and when', () => {
    expect(entitySubLabel(exp('a', '2024 – Present'))).toBe('Co · 2024 – Present')
    expect(entitySubLabel(skill('s', []))).toBe('advanced')
  })
})

describe('parseEndDate', () => {
  it('reads the end of the usual period formats', () => {
    expect(parseEndDate('02/2026 – 08/2026')).toEqual(new Date(2026, 7, 1))
    expect(parseEndDate('June 2024 – August 2024')).toEqual(new Date(2024, 7, 1))
    expect(parseEndDate('Jan 2023 — Mar 2023')).toEqual(new Date(2023, 2, 1))
    expect(parseEndDate('2020 – 2026')).toEqual(new Date(2026, 0, 1))
  })

  it('puts "Present" after every date', () => {
    expect(parseEndDate('2024 – Present').getTime()).toBeGreaterThan(parseEndDate('2030').getTime())
  })
})

describe('groupEntities', () => {
  it('sorts experiences and education by end date, most recent first', () => {
    const groups = groupEntities([exp('old', '2019 – 2020'), exp('now', '2024 – Present'), edu('bsc', '2018 – 2021'), edu('msc', '2021 – 2023')], cfg())
    expect(groups.experiences.map((e) => e.id)).toEqual(['now', 'old'])
    expect(groups.education.map((e) => e.id)).toEqual(['msc', 'bsc'])
  })

  it('follows a custom experience order', () => {
    const groups = groupEntities([exp('a', '2024 – Present'), exp('b', '2019 – 2020')], cfg({ experience_order: ['b', 'a'] }))
    expect(groups.experiences.map((e) => e.id)).toEqual(['b', 'a'])
  })

  it('sorts projects and skills by AI score', () => {
    const config = cfg({ ai_rankings: [{ entity_id: 'p2', score: 0.9 }, { entity_id: 'p1', score: 0.2 }, { entity_id: 's2', score: 0.8 }] })
    const groups = groupEntities([proj('p1'), proj('p2'), skill('s1', []), skill('s2', [])], config)
    expect(groups.projects.map((e) => e.id)).toEqual(['p2', 'p1'])
    expect(groups.skills.map((e) => e.id)).toEqual(['s2', 's1'])
  })
})

describe('toggleEntity', () => {
  it('adds and removes an experience in both the selection and its order', () => {
    const e = exp('a', '2024')
    const on = toggleEntity(cfg(), e)
    expect(on.selected_entity_ids).toEqual(['a'])
    expect(on.experience_order).toEqual(['a'])
    const off = toggleEntity(on, e)
    expect(off.selected_entity_ids).toEqual([])
    expect(off.experience_order).toEqual([])
  })

  it('does not touch the orders for a skill', () => {
    const next = toggleEntity(cfg(), skill('s', []))
    expect(next.selected_entity_ids).toEqual(['s'])
    expect(next.project_order).toBeUndefined()
  })
})

describe('moveEntity', () => {
  it('swaps with the neighbour and stops at the ends', () => {
    const config = cfg({ project_order: ['a', 'b', 'c'] })
    expect(moveEntity(config, 'projects', 'b', 'up').project_order).toEqual(['b', 'a', 'c'])
    expect(moveEntity(config, 'projects', 'b', 'down').project_order).toEqual(['a', 'c', 'b'])
    expect(moveEntity(config, 'projects', 'a', 'up')).toBe(config)
    expect(moveEntity(config, 'projects', 'c', 'down')).toBe(config)
  })
})

describe('applyAiOrder', () => {
  it('orders the selected projects by score', () => {
    const config = cfg({ selected_entity_ids: ['p1', 'p2'], ai_rankings: [{ entity_id: 'p2', score: 0.7 }] })
    expect(applyAiOrder(config, [proj('p1'), proj('p2'), proj('p3')], 'projects').project_order).toEqual(['p2', 'p1'])
  })
})

describe('toggleSkillTag', () => {
  it('keeps an override only while the selection differs from the base tags', () => {
    const narrowed = toggleSkillTag(cfg(), 's', 'Go', ['Go', 'Rust'])
    expect(narrowed.skill_tag_overrides).toEqual({ s: ['Rust'] })
    expect(toggleSkillTag(narrowed, 's', 'Go', ['Go', 'Rust']).skill_tag_overrides).toEqual({})
  })
})

describe('setDescription', () => {
  it('stores a custom text and drops it when back to the original or empty', () => {
    const custom = setDescription(cfg(), 'a', 'new text', 'original')
    expect(custom.entity_description_overrides).toEqual({ a: 'new text' })
    expect(setDescription(custom, 'a', 'original', 'original').entity_description_overrides).toEqual({})
    expect(setDescription(custom, 'a', '  ', 'original').entity_description_overrides).toEqual({})
  })
})

describe('resetConfig', () => {
  it('keeps only education selected', () => {
    expect(resetConfig([edu('e', '2020'), proj('p')]).selected_entity_ids).toEqual(['e'])
  })
})

describe('initialConfig', () => {
  const ai = {
    recommended_experience_ids: ['x'],
    recommended_project_ids: ['p'],
    recommended_skill_ids: ['s'],
    recommended_skill_tags: { s: ['Go'] },
  } as unknown as AIAnalysisResult

  it('selects education when nothing is saved, then adds the AI recommendations and orders', () => {
    const entities = [edu('e', '2020'), exp('x', '2024'), proj('p'), skill('s', ['Go', 'Rust'])]
    const result = initialConfig(null, entities, ai)
    expect(result.selected_entity_ids).toEqual(['e', 'x', 'p', 's'])
    expect(result.skill_tag_overrides).toEqual({ s: ['Go'] })
    expect(result.experience_order).toEqual(['x'])
    expect(result.project_order).toEqual(['p'])
  })

  it('never replaces a tag choice the user already made', () => {
    const saved = cfg({ selected_entity_ids: ['s'], skill_tag_overrides: { s: ['Rust'] } })
    expect(initialConfig(saved, [skill('s', ['Go', 'Rust', 'C'])], ai).skill_tag_overrides).toEqual({ s: ['Rust'] })
  })
})
