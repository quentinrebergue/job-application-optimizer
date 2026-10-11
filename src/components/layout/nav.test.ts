import { describe, it, expect } from 'vitest'
import { isActiveSection } from './nav'

describe('isActiveSection', () => {
  const resume = { href: '/resume', alsoActiveOn: ['/entities'] }

  it('matches the section page and its sub-pages', () => {
    expect(isActiveSection('/resume', resume)).toBe(true)
    expect(isActiveSection('/resume/entities', resume)).toBe(true)
  })

  it('matches the extra prefixes', () => {
    expect(isActiveSection('/entities/experience/abc', resume)).toBe(true)
  })

  it('does not match a path that only starts with the same letters', () => {
    expect(isActiveSection('/resumes', resume)).toBe(false)
    expect(isActiveSection('/jobs', resume)).toBe(false)
  })
})
