import { describe, it, expect } from 'vitest'
import { LIMITS } from './limits'

describe('LIMITS', () => {
  it('holds the description an offer\'s resume may use in place of an entry\'s to the limit of the entry itself', () => {
    // One number for a description: a text for one job cannot be longer than the entry it replaces.
    expect(LIMITS.resume.entityDescription).toBe(Math.max(LIMITS.experiences.description, LIMITS.projects.description))
    expect(LIMITS.resume.entityDescription).toBeGreaterThanOrEqual(LIMITS.experiences.description)
    expect(LIMITS.resume.entityDescription).toBeGreaterThanOrEqual(LIMITS.projects.description)
  })

  it('holds the profile paragraph, which sits on the same page, to the same block of text', () => {
    expect(LIMITS.profile.profile_text).toBe(LIMITS.experiences.description)
    expect(LIMITS.profile.profile_text).toBe(LIMITS.projects.description)
  })
})
