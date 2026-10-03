import { describe, it, expect } from 'vitest'
import { parseJobTab, parseStatusFilter } from './job-filter'

describe('parseStatusFilter', () => {
  it('keeps a known status', () => {
    expect(parseStatusFilter('applied')).toBe('applied')
  })

  it('falls back to all for anything else', () => {
    for (const value of [undefined, '', 'nope', ['applied']]) expect(parseStatusFilter(value)).toBe('all')
  })
})

describe('parseJobTab', () => {
  it('opens the offer unless the resume is asked for (cover letter is off)', () => {
    expect(parseJobTab('resume')).toBe('resume')
    for (const value of [undefined, 'offer', 'cover-letter', 'nope']) expect(parseJobTab(value)).toBe('offer')
  })
})
