import { describe, it, expect } from 'vitest'
import { SignupSchema, LoginSchema } from '@/lib/validation/auth-schemas'

describe('SignupSchema', () => {
  it('accepts a valid email and strong password', () => {
    const result = SignupSchema.safeParse({ email: 'test@example.com', password: 'abcd1234' })
    expect(result.success).toBe(true)
  })

  it('rejects an invalid email', () => {
    const result = SignupSchema.safeParse({ email: 'not-an-email', password: 'abcd1234' })
    expect(result.success).toBe(false)
  })

  it('rejects a password shorter than 8 characters', () => {
    const result = SignupSchema.safeParse({ email: 'test@example.com', password: 'ab1' })
    expect(result.success).toBe(false)
  })

  it('rejects a password with no digit', () => {
    const result = SignupSchema.safeParse({ email: 'test@example.com', password: 'abcdefgh' })
    expect(result.success).toBe(false)
  })

  it('rejects a password with no letter', () => {
    const result = SignupSchema.safeParse({ email: 'test@example.com', password: '12345678' })
    expect(result.success).toBe(false)
  })
})

describe('LoginSchema', () => {
  it('rejects an empty password', () => {
    const result = LoginSchema.safeParse({ email: 'test@example.com', password: '' })
    expect(result.success).toBe(false)
  })
})
