import { describe, it, expect } from 'vitest'
import { libraryHref, parseEntityType, parseLibraryTab, readLibraryState } from './entity-filter'

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

  it('puts the open entry or the creation in the address, an entry first', () => {
    expect(libraryHref('experiences', { entry: 'expe-1' })).toBe('/resume?entry=expe-1')
    expect(libraryHref('projects', { entry: 'proj-9' })).toBe('/resume?tab=projects&entry=proj-9')
    expect(libraryHref('skills', { creating: 'skills' })).toBe('/resume?tab=skills&new=skills')
    expect(libraryHref('projects', { entry: 'proj-9', creating: 'projects' })).toBe('/resume?tab=projects&entry=proj-9')
  })

  it('reads the state of the library back from its address', () => {
    const state = (query: string) => readLibraryState(new URLSearchParams(query))
    expect(state('')).toEqual({ tab: 'experiences', entry: undefined, creating: undefined })
    expect(state('tab=projects&entry=proj-9')).toEqual({ tab: 'projects', entry: 'proj-9', creating: undefined })
    expect(state('tab=skills&new=skills')).toEqual({ tab: 'skills', entry: undefined, creating: 'skills' })
    expect(state('tab=nope&new=nope&entry=')).toEqual({ tab: 'experiences', entry: undefined, creating: undefined })
  })

  it('gives back the address it reads', () => {
    for (const [type, dialog] of [['education', { entry: 'educ-3' }], ['projects', { creating: 'projects' }], ['experiences', {}]] as const) {
      const query = libraryHref(type, dialog).split('?')[1] ?? ''
      const read = readLibraryState(new URLSearchParams(query))
      expect(read).toMatchObject({ tab: type, entry: dialog.entry, creating: 'entry' in dialog ? undefined : dialog.creating })
    }
  })
})
