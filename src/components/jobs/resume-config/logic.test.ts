import { describe, it, expect } from 'vitest'
import type { EntityMeta, ResumeConfig } from '@/types'
import type { AIAnalysisResult } from '@/types/job'
import {
  EMPTY_CONFIG, applyAiOrder, backToChronologicalOrder, hasCustomExperienceOrder, entitySubLabel, groupEntities, initialConfig, moveEntity,
  resetConfig, setDescription, headerSuggestions, dismissHeaderSuggestion, setDescriptionVariant, toggleEntity, toggleProjectTech, toggleSkillTag,
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
    expect(entitySubLabel(skill('s', []))).toBe('')
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

  it('sorts projects by the AI level, then by its order, in a live analysis', () => {
    const entry = (id: string, level: 0 | 1 | 2 | 3, rank: number) => ({ id, type: 'project' as const, name: id, level, rank, reason: '' })
    const ai = { entities_by_type: { experiences: [], skills: [], education: [], projects: [entry('p1', 2, 3), entry('p2', 3, 2), entry('p3', 3, 1), entry('p4', 0, 4)] } } as unknown as AIAnalysisResult
    const groups = groupEntities([proj('p1'), proj('p2'), proj('p3'), proj('p4')], cfg(), ai)
    expect(groups.projects.map((e) => e.id)).toEqual(['p3', 'p2', 'p1', 'p4'])
  })

  it('still reads a ranking saved with a score and no level', () => {
    const entry = (id: string, score: number) => ({ id, type: 'project' as const, name: id, score, reason: '' })
    const ai = { entities_by_type: { experiences: [], skills: [], education: [], projects: [entry('p1', 40), entry('p2', 90)] } } as unknown as AIAnalysisResult
    expect(groupEntities([proj('p1'), proj('p2')], cfg(), ai).projects.map((e) => e.id)).toEqual(['p2', 'p1'])
  })
})

describe('toggleEntity', () => {
  it('adds a project to the selection and the order, and keeps its place when it is unselected', () => {
    const p = proj('a')
    const on = toggleEntity(cfg(), p)
    expect(on.selected_entity_ids).toEqual(['a'])
    expect(on.project_order).toEqual(['a'])
    const off = toggleEntity(on, p)
    expect(off.selected_entity_ids).toEqual([])
    expect(off.project_order).toEqual(['a'])
    expect(toggleEntity(off, p).project_order).toEqual(['a'])
  })

  it('gives an experience no order of its own: it keeps following the dates (#295)', () => {
    const e = exp('a', '2024')
    const on = toggleEntity(cfg(), e)
    expect(on.selected_entity_ids).toEqual(['a'])
    expect(on.experience_order).toBeUndefined()
    expect(toggleEntity(on, e).experience_order).toBeUndefined()
  })

  it('does not move an entry in the list when it is unselected', () => {
    const entities = [exp('a', '2024 – Present'), exp('b', '2022 – 2023'), exp('c', '2019 – 2021')]
    const config = cfg({ selected_entity_ids: ['a', 'b', 'c'], experience_order: ['c', 'a', 'b'] })
    const off = toggleEntity(config, entities[1])
    expect(groupEntities(entities, off).experiences.map((e) => e.id)).toEqual(['c', 'a', 'b'])
  })

  it('does not touch the orders for a skill', () => {
    const next = toggleEntity(cfg(), skill('s', []))
    expect(next.selected_entity_ids).toEqual(['s'])
    expect(next.project_order).toBeUndefined()
  })
})

describe('moveEntity', () => {
  it('swaps with the neighbour and stops at the ends', () => {
    const config = cfg({ selected_entity_ids: ['a', 'b', 'c'], project_order: ['a', 'b', 'c'] })
    expect(moveEntity(config, 'projects', 'b', 'up').project_order).toEqual(['b', 'a', 'c'])
    expect(moveEntity(config, 'projects', 'b', 'down').project_order).toEqual(['a', 'c', 'b'])
    expect(moveEntity(config, 'projects', 'a', 'up')).toBe(config)
    expect(moveEntity(config, 'projects', 'c', 'down')).toBe(config)
  })

  it('skips unselected entries, so one click always moves among the printed ones', () => {
    const config = cfg({ selected_entity_ids: ['a', 'c'], project_order: ['a', 'b', 'c'] })
    expect(moveEntity(config, 'projects', 'c', 'up').project_order).toEqual(['c', 'b', 'a'])
  })
})

describe('moveEntity on experiences that follow the dates (#295)', () => {
  it('starts from the order on screen when no order is saved yet', () => {
    const config = cfg({ selected_entity_ids: ['a', 'b', 'c'] })
    expect(moveEntity(config, 'experiences', 'b', 'up').experience_order).toBeUndefined()
    expect(moveEntity(config, 'experiences', 'b', 'up', ['a', 'b', 'c']).experience_order).toEqual(['b', 'a', 'c'])
  })
})

describe('the order of the experiences of a job (#295)', () => {
  const entities = [exp('teach', '09/2024 – 02/2026'), exp('now', '02/2026 – Now'), exp('old', '2019 – 2020')]

  it('says nothing while the experiences follow the dates, with or without a saved order that agrees', () => {
    const selected = ['teach', 'now', 'old']
    expect(hasCustomExperienceOrder(cfg({ selected_entity_ids: selected }), entities)).toBe(false)
    expect(hasCustomExperienceOrder(cfg({ selected_entity_ids: selected, experience_order: ['now', 'teach', 'old'] }), entities)).toBe(false)
  })

  it('says so when a saved order puts them out of time, as the AI did before', () => {
    const config = cfg({ selected_entity_ids: ['teach', 'now', 'old'], experience_order: ['teach', 'now', 'old'] })
    expect(hasCustomExperienceOrder(config, entities)).toBe(true)
    // An experience that is not selected does not count.
    expect(hasCustomExperienceOrder({ ...config, selected_entity_ids: ['now'] }, entities)).toBe(false)
  })

  it('goes back to the dates by removing the saved order only', () => {
    const config = cfg({ selected_entity_ids: ['teach', 'now'], experience_order: ['teach', 'now'], project_order: ['p'] })
    const back = backToChronologicalOrder(config)
    expect(back.experience_order).toBeUndefined()
    expect(back.project_order).toEqual(['p'])
    expect(groupEntities(entities, back).experiences.map((e) => e.id)).toEqual(['now', 'teach', 'old'])
  })

  it('shows the panel in the order of the PDF: ongoing first, then the later start', () => {
    const groups = groupEntities([exp('teach', '09/2024 – 02/2026'), exp('now', '02/2026 – Now')], cfg())
    expect(groups.experiences.map((e) => e.id)).toEqual(['now', 'teach'])
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

describe('setDescriptionVariant', () => {
  it('records the version chosen for an entry and removes the choice for the main description', () => {
    const chosen = setDescriptionVariant(cfg(), 'a', 'Short')
    expect(chosen.description_variant).toEqual({ a: 'Short' })
    expect(setDescriptionVariant(chosen, 'b', 'Long').description_variant).toEqual({ a: 'Short', b: 'Long' })
    expect(setDescriptionVariant(chosen, 'a', null).description_variant).toEqual({})
  })

  it('drops the text written for the job on that entry only, since it would hide the version just chosen', () => {
    const written = setDescription(setDescription(cfg(), 'a', 'mine', 'original'), 'b', 'other', 'original')
    expect(setDescriptionVariant(written, 'a', 'Short').entity_description_overrides).toEqual({ b: 'other' })
  })
})

describe('resetConfig', () => {
  it('keeps only education selected', () => {
    expect(resetConfig([edu('e', '2020'), proj('p')]).selected_entity_ids).toEqual(['e'])
  })
})

describe('initialConfig', () => {
  const ai = {
    analyzed_at: '2026-10-01T00:00:00Z',
    recommended_experience_ids: ['x'],
    recommended_project_ids: ['p'],
    recommended_skill_ids: ['s'],
    recommended_skill_tags: { s: ['Go'] },
  } as unknown as AIAnalysisResult

  it('selects education when nothing is saved, then adds the AI recommendations (no skill) and the order of the projects', () => {
    const entities = [edu('e', '2020'), exp('x', '2024'), proj('p'), skill('s', ['Go', 'Rust'])]
    const result = initialConfig(null, entities, ai)
    // No skill is ticked, although the AI recommends one (#302); the tags it narrowed wait for the user to tick it.
    expect(result.selected_entity_ids).toEqual(['e', 'x', 'p'])
    expect(result.skill_tag_overrides).toEqual({ s: ['Go'] })
    // The experiences stay in the order of the dates, whatever the AI's order (#295); the projects follow the AI.
    expect(result.experience_order).toBeUndefined()
    expect(result.project_order).toEqual(['p'])
  })

  it('applies the recommendations of an analysis once: what the user unticked stays unticked', () => {
    const entities = [edu('e', '2020'), exp('x', '2024'), proj('p'), skill('s', ['Go', 'Rust'])]
    const analysis = { ...ai, analyzed_at: '2026-10-15T10:00:00Z' } as AIAnalysisResult
    const first = initialConfig(null, entities, analysis)
    expect(first.ai_applied_at).toBe('2026-10-15T10:00:00Z')
    // The user unticks the project; that is saved with the marker. The next visit must not tick it again.
    const saved = { ...first, selected_entity_ids: first.selected_entity_ids.filter((id) => id !== 'p') }
    const again = initialConfig(saved, entities, analysis)
    expect(again.selected_entity_ids).toEqual(['e', 'x'])
  })

  it('applies the recommendations again for a new analysis (Rank again)', () => {
    const entities = [edu('e', '2020'), exp('x', '2024'), proj('p'), skill('s', ['Go', 'Rust'])]
    const saved = cfg({ selected_entity_ids: ['e', 'x'], ai_applied_at: '2026-10-15T10:00:00Z', project_order: [], experience_order: ['x'] })
    const newer = { ...ai, analyzed_at: '2026-10-16T08:00:00Z' } as AIAnalysisResult
    const result = initialConfig(saved, entities, newer)
    expect(result.selected_entity_ids).toContain('p')
    expect(result.ai_applied_at).toBe('2026-10-16T08:00:00Z')
  })

  it('applies them to a configuration saved before the marker existed (once, then the marker is saved with the next change)', () => {
    const entities = [exp('x', '2024'), proj('p')]
    const legacy = cfg({ selected_entity_ids: ['x'] })
    const analysis = { ...ai, analyzed_at: '2026-10-15T10:00:00Z' } as AIAnalysisResult
    expect(initialConfig(legacy, entities, analysis).selected_entity_ids).toEqual(['x', 'p'])
  })

  it('does not touch the selection when there is no analysis', () => {
    const saved = cfg({ selected_entity_ids: ['x'] })
    expect(initialConfig(saved, [exp('x', '2024')], null).ai_applied_at).toBeUndefined()
  })

  it('keeps the skills a saved selection holds, and ticking a skill afterwards prints the tags the AI narrowed', () => {
    const entities = [skill('s', ['Go', 'Rust']), skill('t', ['C'])]
    const saved = cfg({ selected_entity_ids: ['t'], ai_applied_at: '2026-10-01T00:00:00Z' })
    expect(initialConfig(saved, entities, ai).selected_entity_ids).toContain('t')
    expect(initialConfig(saved, entities, ai).selected_entity_ids).not.toContain('s')
    const fresh = initialConfig(null, entities, ai)
    expect(fresh.selected_entity_ids).not.toContain('s')
    expect(toggleEntity(fresh, entities[0]).skill_tag_overrides).toEqual({ s: ['Go'] })
  })

  it('never replaces a tag choice the user already made', () => {
    const saved = cfg({ selected_entity_ids: ['s'], skill_tag_overrides: { s: ['Rust'] } })
    expect(initialConfig(saved, [skill('s', ['Go', 'Rust', 'C'])], ai).skill_tag_overrides).toEqual({ s: ['Rust'] })
  })
})

describe('toggleProjectTech', () => {
  it('hides the technologies, and showing them again keeps no key (shown is the default)', () => {
    const hidden = toggleProjectTech(cfg())
    expect(hidden.show_project_tech).toBe(false)
    const shown = toggleProjectTech(hidden)
    expect('show_project_tech' in shown).toBe(false)
  })

  it('changes nothing else in the configuration', () => {
    const base = cfg({ selected_entity_ids: ['a'], project_order: ['a'] })
    expect(toggleProjectTech(base)).toEqual({ ...base, show_project_tech: false })
  })
})

describe('the title and the profile the AI suggests (#294)', () => {
  const ai = {
    analyzed_at: '2026-10-20T10:00:00Z',
    recommended_title: 'Platform Engineer',
    title_new_terms: [],
    recommended_profile: 'Platform developer. Go and Rust.',
    profile_new_terms: ['Rust'],
  } as unknown as AIAnalysisResult
  const current = { resume_title: 'Software Engineer', profile_text: 'Backend developer. Go.' }

  it('offers what differs from the resume, with its new words', () => {
    expect(headerSuggestions(ai, current, cfg())).toEqual([
      { field: 'resume_title', text: 'Platform Engineer', newTerms: [] },
      { field: 'profile_text', text: 'Platform developer. Go and Rust.', newTerms: ['Rust'] },
    ])
  })

  it('offers nothing without an analysis or without a proposal, and not what the resume already says', () => {
    expect(headerSuggestions(null, current, cfg())).toEqual([])
    expect(headerSuggestions({ analyzed_at: 'x' } as AIAnalysisResult, current, cfg())).toEqual([])
    expect(headerSuggestions(ai, { ...current, resume_title: ' Platform Engineer ' }, cfg()).map((s) => s.field)).toEqual(['profile_text'])
  })

  it('does not offer again what the user turned down, until a new analysis', () => {
    const kept = dismissHeaderSuggestion(cfg(), 'resume_title', ai.analyzed_at)
    expect(kept.ai_header_dismissed).toEqual({ resume_title: '2026-10-20T10:00:00Z' })
    expect(headerSuggestions(ai, current, kept).map((s) => s.field)).toEqual(['profile_text'])
    expect(headerSuggestions({ ...ai, analyzed_at: '2026-10-21T10:00:00Z' }, current, kept).map((s) => s.field)).toEqual(['resume_title', 'profile_text'])
    expect(dismissHeaderSuggestion(kept, 'profile_text', ai.analyzed_at).ai_header_dismissed).toEqual({ resume_title: ai.analyzed_at, profile_text: ai.analyzed_at })
  })
})
