import { describe, it, expect } from 'vitest'
import type { EntityMeta } from '@/types'
import { ENTITY_FIELDS, entityChips, entitySubtitle, fieldUpdate, missingFields, toPayload, toValues } from './entity-fields'

describe('entity fields', () => {
  it('turns an entry into form values and back, lists included', () => {
    const project = { id: 'p', type: 'projects', title: 'Queue', tech: ['Go', 'Redis'], description: 'A queue', tags: ['backend'] } as EntityMeta
    const values = toValues('projects', project)
    expect(values).toEqual({ title: 'Queue', tech: 'Go, Redis', description: 'A queue' })
    // A project's technologies are saved as its tags too: one list for the resume and the AI.
    expect(toPayload('projects', { ...values, tech: ' Go ,Rust,, ' })).toEqual({ title: 'Queue', tech: ['Go', 'Rust'], tags: ['Go', 'Rust'], description: 'A queue' })
  })

  it('does not ask for a skill level, and sends the neutral one on creation', () => {
    expect(toValues('skills')).toEqual({ name: '', category: '', tags: '' })
    expect(toPayload('skills', { name: 'Languages', category: 'Programming', tags: 'C, Go' })).toEqual({
      level: 'intermediate', name: 'Languages', category: 'Programming', tags: ['C', 'Go'],
    })
  })

  it('reports the required fields left empty', () => {
    expect(missingFields('experiences', { title: ' ', company: 'Acme' })).toEqual({ title: 'Enter the title.' })
    expect(missingFields('education', { degree: 'MSc', institution: 'EPITA' })).toEqual({})
  })

  it('saves one field with the keys it mirrors', () => {
    const tech = ENTITY_FIELDS.projects.find((f) => f.key === 'tech')!
    expect(fieldUpdate(tech, 'C, Linux')).toEqual({ tech: ['C', 'Linux'], tags: ['C', 'Linux'] })
  })

  it('shows a project\'s technologies as chips, the tags otherwise', () => {
    expect(entityChips({ type: 'projects', tech: ['Go'], tags: ['old'] } as EntityMeta)).toEqual(['Go'])
    expect(entityChips({ type: 'skills', tags: ['C'] } as EntityMeta)).toEqual(['C'])
  })

  it('shows where and when on the second line', () => {
    expect(entitySubtitle({ type: 'experiences', company: 'Acme', period: '2024' } as EntityMeta)).toBe('Acme · 2024')
    expect(entitySubtitle({ type: 'skills', category: 'Languages' } as EntityMeta)).toBe('Languages')
  })
})
