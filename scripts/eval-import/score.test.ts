import { describe, it, expect } from 'vitest'
import { likeness, sameValue, scoreImport, type Got } from './score'

const got = (over: Partial<Got> = {}): Got => ({ profile: {}, experiences: [], projects: [], education: [], skills: [], ...over })

describe('sameValue and likeness', () => {
  it('compares without case, accents or punctuation, and accepts a value that holds the other', () => {
    expect(sameValue('Ingénieure Backend', 'ingenieure backend')).toBe(true)
    expect(sameValue('Aumovio (ex: Continental Automotive)', 'Aumovio')).toBe(true)
    expect(sameValue('', 'Aumovio')).toBe(false)
    expect(sameValue('', '')).toBe(true)
  })

  it('measures the words in common', () => {
    expect(likeness('Tiger Compiler', 'Tiger Compiler (C++)')).toBeGreaterThan(0.5)
    expect(likeness('Tiger Compiler', 'Mini Docker')).toBe(0)
    // A longer title for the same thing is still alike enough to pair.
    expect(likeness('Computer Engineering EPITA', 'Computer Engineering, Real time and embedded systems, Linux development EPITA')).toBeGreaterThanOrEqual(0.34)
  })
})

describe('scoreImport', () => {
  const truth = {
    profile: { full_name: 'Camille Moreau', email: 'camille@example.com', linkedin: { optional: 'linkedin.com/in/camille' }, address: { any: ['Lyon', 'Paris'] } },
    experiences: [
      { title: 'Backend engineer', company: 'Logistix', period: '2022 – Present' },
      { title: 'Volunteer', company: 'Club', period: '2019', optional: true },
    ],
    projects: [{ title: 'Tiger Compiler' }, { title: 'Mini Docker' }],
    education: [{ degree: 'MSc', institution: 'EPITA', period: '2020 – 2026' }],
    skills: { min: 2, max: 10 },
  }

  it('finds every expected entry and field, whatever the order and the wording within reason', () => {
    const s = scoreImport(truth, got({
      profile: { full_name: 'CAMILLE MOREAU', email: 'camille@example.com', address: 'Lyon, France' },
      experiences: [{ title: 'Backend Engineer', company: 'Logistix SA', period: '2022 – Present' }],
      projects: [{ title: 'Mini Docker' }, { title: 'Tiger Compiler (C++)' }],
      education: [{ degree: 'MSc Computer Engineering', institution: 'EPITA', period: '2020 – 2026' }],
      skills: [1, 2, 3],
    }))
    expect(s.perfect).toBe(true)
    expect(s.kinds.experiences).toMatchObject({ expected: 1, found: 1, extra: 0, fieldsRight: 3, fields: 3 })
    expect(s.profile).toMatchObject({ right: 3, total: 3 }) // the optional LinkedIn is not given, so not counted
  })

  it('names what is missing, what is not expected, and the wrong fields', () => {
    const s = scoreImport(truth, got({
      profile: { full_name: 'Alice', email: 'camille@example.com', address: 'Berlin', linkedin: 'linkedin.com/in/someone' },
      experiences: [{ title: 'Backend engineer', company: 'Logistix', period: '2021' }, { title: 'Moved boxes', company: 'Warehouse', period: '' }],
      projects: [{ title: 'Tiger Compiler' }],
      education: [],
      skills: [1],
    }))
    expect(s.perfect).toBe(false)
    expect(s.kinds.experiences).toMatchObject({ found: 1, extra: 1, fieldsRight: 2, fields: 3 })
    expect(s.kinds.projects).toMatchObject({ expected: 2, found: 1 })
    expect(s.kinds.education).toMatchObject({ expected: 1, found: 0 })
    expect(s.profile).toMatchObject({ right: 1, total: 4 })
    expect(s.skills.ok).toBe(false)
    expect(s.kinds.projects.problems).toEqual(['projects: missing "Mini Docker"'])
    expect(s.kinds.experiences.problems).toContain('experiences: not expected "Moved boxes Warehouse"')
  })

  it('does not count an optional entry as missing, nor as extra when the import gives it', () => {
    const s = scoreImport(truth, got({ experiences: [{ title: 'Volunteer', company: 'Club', period: '2019' }] }))
    expect(s.kinds.experiences).toMatchObject({ expected: 1, found: 0, extra: 0 })
  })
})
