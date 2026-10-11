import { describe, it, expect } from 'vitest'
import type { EntityMeta } from '@/types'
import { padEntities, poolSize, type Distractors } from './pad'

const e = (id: string, type: EntityMeta['type'] = 'experiences') => ({ id, type }) as EntityMeta
const ids = (list: EntityMeta[]) => list.map((x) => x.id)

const pool: Distractors = {
  experiences: ['pe1', 'pe2', 'pe3', 'pe4', 'pe5'].map((id) => e(id)),
  projects: ['pp1', 'pp2', 'pp3'].map((id) => e(id, 'projects')),
  skills: ['ps1', 'ps2', 'ps3', 'ps4'].map((id) => e(id, 'skills')),
}
const library = {
  experiences: [e('real-e1'), e('real-e2')],
  projects: [e('real-p1', 'projects')],
  skills: [e('real-s1', 'skills')],
  education: [e('real-edu', 'education')],
}

describe('padEntities', () => {
  it('adds n entries of each kind, with the real ones in the middle', () => {
    const padded = padEntities(library, pool, 2)
    expect(ids(padded.experiences)).toEqual(['pe1', 'real-e1', 'real-e2', 'pe2'])
    expect(ids(padded.skills)).toEqual(['ps1', 'real-s1', 'ps2'])
  })

  it('puts the odd one before: half rounded up in front', () => {
    expect(ids(padEntities(library, pool, 3).projects)).toEqual(['pp1', 'pp2', 'real-p1', 'pp3'])
  })

  it('leaves education, the input and the case alone', () => {
    const padded = padEntities(library, pool, 2)
    expect(ids(padded.education)).toEqual(['real-edu'])
    expect(ids(library.experiences)).toEqual(['real-e1', 'real-e2'])
  })

  it('does nothing for 0', () => {
    expect(ids(padEntities(library, pool, 0).experiences)).toEqual(['real-e1', 'real-e2'])
  })

  it('refuses more than the pool holds, naming the limit', () => {
    expect(poolSize(pool)).toBe(3)
    expect(() => padEntities(library, pool, 4)).toThrow('--pad 4: the pool in eval/distractors.json has 3')
    expect(() => padEntities(library, pool, 3)).not.toThrow()
  })
})
