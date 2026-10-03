import { describe, it, expect } from 'vitest'
import { parseStatusFilter } from './job-filter'

describe('parseStatusFilter', () => {
  it('keeps a known status', () => {
    expect(parseStatusFilter('applied')).toBe('applied')
  })

  it('falls back to all for anything else', () => {
    for (const value of [undefined, '', 'nope', ['applied']]) expect(parseStatusFilter(value)).toBe('all')
  })
})
