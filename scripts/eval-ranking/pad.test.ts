import { describe, it, expect } from 'vitest'
import type { EntityMeta } from '@/types'
import { lengthen, padEntities, poolSize, type Distractors } from './pad'

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

describe('lengthen', () => {
  const d = (id: string, description: string) => ({ id, type: 'projects', description }) as unknown as EntityMeta
  const siblings = [d('a', 'First one is short.'), d('b', 'Second is a bit longer than the first. It has two sentences.'), d('c', 'Third talks about something else entirely.')]
  const text = (e: EntityMeta) => (e as unknown as { description: string }).description

  it('continues with the next entries until it is about as long as asked, ending on a sentence', () => {
    const out = text(lengthen(siblings[0], siblings, 90))
    expect(out.startsWith('First one is short. Second is a bit longer')).toBe(true)
    expect(out.length).toBeLessThanOrEqual(90)
    expect(out.length).toBeGreaterThan(50)
    expect(out.endsWith('.')).toBe(true)
  })

  it('wraps around the list and never goes over the length', () => {
    for (const length of [60, 120, 400]) expect(text(lengthen(siblings[2], siblings, length)).length).toBeLessThanOrEqual(length)
    expect(text(lengthen(siblings[2], siblings, 400))).toContain('First one is short.')
  })

  it('leaves an entry that is long enough, and an entry with no description, alone', () => {
    expect(lengthen(siblings[1], siblings, 20)).toBe(siblings[1])
    const bare = { id: 'x', type: 'skills' } as unknown as EntityMeta
    expect(lengthen(bare, siblings, 500)).toBe(bare)
  })

  it('is used by padEntities when a length is given, and only for the extra entries', () => {
    const lib = { experiences: [d('real', 'Real one.')], projects: [d('real-p', 'Real project.')], skills: [], education: [] }
    const poolLong: Distractors = { experiences: siblings, projects: siblings, skills: [d('s1', 'Skill.')] }
    const padded = padEntities(lib, poolLong, 1, 120)
    expect(text(padded.projects[1])).toBe('Real project.')
    expect(text(padded.projects[0]).length).toBeGreaterThan(40)
    expect(text(padEntities(lib, poolLong, 1).projects[0])).toBe('First one is short.')
  })
})

