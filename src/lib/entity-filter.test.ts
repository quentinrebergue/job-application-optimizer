import { describe, it, expect } from 'vitest'
import { libraryHref, parseEntityType, parseLibraryTab } from './entity-filter'

describe('library filter', () => {
  it('keeps a known kind of entry', () => {
    expect(parseLibraryTab('education')).toBe('education')
    expect(parseEntityType('skills')).toBe('skills')
  })

  it('opens the experiences for anything else', () => {
    for (const value of [undefined, '', 'all', 'nope', ['skills']]) {
      expect(parseLibraryTab(value)).toBe('experiences')
      expect(parseEntityType(value)).toBeUndefined()
    }
  })

  it('links to the library on one kind', () => {
    expect(libraryHref('experiences')).toBe('/resume')
    expect(libraryHref('skills')).toBe('/resume?tab=skills')
  })
})
