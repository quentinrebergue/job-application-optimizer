import { describe, it, expect } from 'vitest'
import type { EntityMeta } from '@/types'
import {
  makeMain, nextVersionName, parseVariants, printedDescription, serializeVariants, variantsError, variantsOf, versionText,
} from './description-variants'

const project = (extra: object = {}) =>
  ({ id: 'p1', type: 'projects', title: 'P', tech: [], description: 'Main', tags: [], ...extra }) as EntityMeta
const withVersions = project({ descriptions: [{ name: 'Short', text: 'S' }, { name: 'Technical', text: 'T' }] })

describe('the versions of a description', () => {
  it('are those of an experience or a project, none for the other kinds', () => {
    expect(variantsOf(withVersions)).toHaveLength(2)
    expect(variantsOf(project())).toEqual([])
    expect(variantsOf({ type: 'skills', descriptions: [{ name: 'x', text: 'y' }] } as never)).toEqual([])
  })

  it('give the text of the version named, else the main description', () => {
    expect(versionText(withVersions, undefined)).toBe('Main')
    expect(versionText(withVersions, 'Short')).toBe('S')
    // A version deleted or renamed after a job chose it: the job falls back on the main description.
    expect(versionText(withVersions, 'Gone')).toBe('Main')
    expect(versionText(project(), 'Short')).toBe('Main')
  })

  it('are printed in the order: the text written for this job, the chosen version, the main description', () => {
    expect(printedDescription(withVersions, {})).toBe('Main')
    expect(printedDescription(withVersions, { description_variant: { p1: 'Technical' } })).toBe('T')
    expect(printedDescription(withVersions, { description_variant: { p1: 'Technical' }, entity_description_overrides: { p1: 'Mine' } })).toBe('Mine')
    // The choice of another entry does not apply here.
    expect(printedDescription(withVersions, { description_variant: { other: 'Short' } })).toBe('Main')
  })
})

describe('the form of the versions', () => {
  it('writes and reads them as one string, and reads nothing from what is not a list of versions', () => {
    const list = [{ name: 'Short', text: 'S' }]
    expect(parseVariants(serializeVariants(list))).toEqual(list)
    for (const bad of ['', 'nope', '{}', '[1, "a"]', '[{"name": 1}]']) expect(parseVariants(bad)).toEqual([])
  })

  it('refuse a missing name, a name twice (whatever the case), a name or a text too long and too many versions', () => {
    const ok = [{ name: 'Short', text: 'S' }]
    expect(variantsError(ok, 1000)).toBeUndefined()
    expect(variantsError([{ name: ' ', text: 'x' }], 1000)).toMatch(/Give version 1 a name/)
    expect(variantsError([...ok, { name: 'short', text: 'y' }], 1000)).toMatch(/Two versions are named/)
    expect(variantsError([{ name: 'x'.repeat(31), text: '' }], 1000)).toMatch(/at most 30/)
    expect(variantsError([{ name: 'Long', text: 'x'.repeat(1001) }], 1000)).toMatch(/over 1,000 characters/)
    expect(variantsError(Array.from({ length: 4 }, (_, i) => ({ name: `V${i}`, text: '' })), 1000)).toMatch(/At most 3/)
  })

  it('name a new version so that it never takes a name already used', () => {
    expect(nextVersionName([])).toBe('Version 2')
    expect(nextVersionName([{ name: 'Version 2', text: '' }])).toBe('Version 3')
    expect(nextVersionName([{ name: 'version 3', text: '' }, { name: 'Short', text: '' }])).toBe('Version 4')
  })

  it('swap a version with the main description, keeping the name of the version', () => {
    const list = [{ name: 'Short', text: 'S' }, { name: 'Technical', text: 'T' }]
    expect(makeMain('Main', list, 1)).toEqual({ description: 'T', variants: [{ name: 'Short', text: 'S' }, { name: 'Technical', text: 'Main' }] })
    expect(makeMain('Main', list, 9)).toEqual({ description: 'Main', variants: list })
  })
})
