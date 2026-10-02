import { describe, it, expect } from 'vitest'
import { isActiveModule } from './nav'
import { ENABLED_MODULES, isModuleEnabled } from '@/config'

describe('isActiveModule', () => {
  const resume = { href: '/resume', alsoActiveOn: ['/entities'] }

  it('matches the module page and its sub-pages', () => {
    expect(isActiveModule('/resume', resume)).toBe(true)
    expect(isActiveModule('/resume/entities', resume)).toBe(true)
  })

  it('matches the extra prefixes', () => {
    expect(isActiveModule('/entities/experience/abc', resume)).toBe(true)
  })

  it('does not match a path that only starts with the same letters', () => {
    expect(isActiveModule('/resumes', resume)).toBe(false)
    expect(isActiveModule('/jobs', resume)).toBe(false)
  })
})

describe('enabled modules', () => {
  it('shows only Jobs and Resume for now (#79)', () => {
    expect(ENABLED_MODULES.map((mod) => mod.id)).toEqual(['jobs', 'resume'])
  })

  it('switches off Q&A, Coding and Tags', () => {
    for (const id of ['qa', 'coding', 'taxonomy']) expect(isModuleEnabled(id)).toBe(false)
  })
})
