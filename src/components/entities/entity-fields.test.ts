import { describe, it, expect } from 'vitest'
import type { EntityMeta } from '@/types'
import { ENTITY_FIELDS, entityChips, entitySubtitle, fieldUpdate, fieldError, fieldErrors, toPayload, toValues } from './entity-fields'

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
    expect(fieldErrors('experiences', { title: ' ', company: 'Acme' })).toEqual({ title: 'Enter the title.' })
    expect(fieldErrors('education', { degree: 'MSc', institution: 'EPITA' })).toEqual({})
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

describe('size limits (#201)', () => {
  const field = (type: 'experiences' | 'projects', key: string) => ENTITY_FIELDS[type].find((f) => f.key === key)!

  it('gives every text field its limit from the shared table', () => {
    for (const type of ['experiences', 'projects', 'skills', 'education'] as const) {
      for (const f of ENTITY_FIELDS[type].filter((f) => f.kind === 'text' || f.kind === 'textarea')) {
        expect(f.maxLength, `${type}.${f.key}`).toBeGreaterThan(0)
      }
    }
  })

  it('says when a text is over its limit, and is silent at the limit', () => {
    const description = field('projects', 'description')
    expect(fieldError(description, 'a'.repeat(description.maxLength!))).toBeUndefined()
    expect(fieldError(description, 'a'.repeat(description.maxLength! + 1))).toBe('Too long: 5,000 characters at most.')
  })

  it('keeps the message for a required field left empty first', () => {
    expect(fieldError(field('experiences', 'title'), '  ')).toBe('Enter the title.')
  })

  it('reports the too long fields of a whole form', () => {
    const title = 'a'.repeat(151)
    expect(fieldErrors('experiences', { title, company: 'Acme' })).toEqual({ title: 'Too long: 150 characters at most.' })
  })
})
