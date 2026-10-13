import { describe, it, expect } from 'vitest'
import { problems } from './check'

const counts = { experiences: 1, projects: 3, education: 2, skills: 8 }

describe('problems', () => {
  it('says nothing when every count is what was expected', () => {
    expect(problems({ experiences: 1, education: 2, projects: 3, skills: { min: 3, max: 10 } }, counts)).toEqual([])
  })

  it('says which kind is wrong, with the count and what was expected', () => {
    expect(problems({ experiences: 3, skills: { min: 10 } }, counts)).toEqual([
      'experiences: 1 (expected 3)',
      'skills: 8 (expected 10 or more)',
    ])
  })

  it('checks a range at both ends', () => {
    expect(problems({ skills: { min: 3, max: 5 } }, counts)).toEqual(['skills: 8 (expected 3 to 5)'])
    expect(problems({ skills: { max: 5 } }, counts)).toEqual(['skills: 8 (expected 5 or fewer)'])
  })

  it('does not check a kind that is not expected', () => {
    expect(problems({}, counts)).toEqual([])
  })

  it('knows that zero is a number: a resume without projects must give none', () => {
    expect(problems({ projects: 0 }, counts)).toEqual(['projects: 3 (expected 0)'])
    expect(problems({ projects: 0 }, { ...counts, projects: 0 })).toEqual([])
  })
})
