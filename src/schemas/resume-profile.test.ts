import { describe, it, expect } from 'vitest'
import { ResumeProfileSchema } from './resume-profile'

describe('ResumeProfileSchema', () => {
  it('fills every missing field with an empty string', () => {
    const parsed = ResumeProfileSchema.parse({})
    expect(Object.values(parsed).every((v) => v === '')).toBe(true)
    expect(Object.keys(parsed)).toHaveLength(8)
  })

  it('trims whitespace', () => {
    expect(ResumeProfileSchema.parse({ full_name: '  Ada Lovelace  ' }).full_name).toBe('Ada Lovelace')
  })

  it('accepts an empty email and a valid one', () => {
    expect(ResumeProfileSchema.safeParse({ email: '' }).success).toBe(true)
    expect(ResumeProfileSchema.safeParse({ email: 'ada@example.com' }).success).toBe(true)
  })

  it('rejects an invalid email', () => {
    const result = ResumeProfileSchema.safeParse({ email: 'not-an-email' })
    expect(result.success).toBe(false)
  })

  it('rejects values over the length limits', () => {
    expect(ResumeProfileSchema.safeParse({ full_name: 'x'.repeat(201) }).success).toBe(false)
    expect(ResumeProfileSchema.safeParse({ profile_text: 'x'.repeat(5001) }).success).toBe(false)
  })

  it('rejects non-string values instead of coercing them', () => {
    expect(ResumeProfileSchema.safeParse({ phone: 12345 }).success).toBe(false)
  })
})
