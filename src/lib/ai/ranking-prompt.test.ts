import { describe, it, expect } from 'vitest'
import { buildRankingPrompt, normalizeRanking } from './ranking-prompt'

describe('buildRankingPrompt', () => {
  const prompt = buildRankingPrompt('Dev', 'Acme', 'Build things', { experiences: [], projects: [], skills: [], education: [] })

  it('asks for one JSON object and carries the offer', () => {
    expect(prompt).toContain('single valid JSON object')
    expect(prompt).toContain('Title: Dev')
    expect(prompt).toContain('Company: Acme')
  })

  it('contains nothing about a specific person', () => {
    for (const personal of ['EPITA', 'TOEIC', 'watchmaking', 'GISTRE']) expect(prompt).not.toContain(personal)
  })
})

describe('normalizeRanking', () => {
  it('fills the defaults and tags every entity with its type', () => {
    const result = normalizeRanking({
      ats_tags: ['go'],
      confidence_score: 72,
      summary: 'ok',
      entities_by_type: { experiences: [{ id: 'e1', name: 'X', score: 80, reason: 'r' }] },
    })
    expect(result.confidence_score).toBeCloseTo(0.72)
    expect(result.entities_by_type.experiences[0]).toMatchObject({ id: 'e1', type: 'experience' })
    expect(result.entities_by_type.projects).toEqual([])
    expect(result.resume_tips).toEqual([])
    expect(result.recommended_profile).toBe('')
  })

  it('refuses an answer that is not a JSON object', () => {
    for (const bad of [null, 'text', 42, ['a']]) expect(() => normalizeRanking(bad)).toThrow('not a JSON object')
  })
})
