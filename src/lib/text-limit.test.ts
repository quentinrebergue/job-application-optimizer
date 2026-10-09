import { describe, it, expect } from 'vitest'
import { counterFor, isLongText, tooLong } from './text-limit'

describe('tooLong', () => {
  it('is silent up to the limit and says it above', () => {
    expect(tooLong('a'.repeat(100), 100)).toBeUndefined()
    expect(tooLong('a'.repeat(101), 100)).toBe('Too long: 100 characters at most.')
    expect(tooLong('a'.repeat(15001), 15000)).toBe('Too long: 15,000 characters at most.')
  })

  it('counts the trimmed text, as the server does', () => {
    expect(tooLong(`  ${'a'.repeat(100)}  `, 100)).toBeUndefined()
  })

  it('has no opinion without a limit', () => {
    expect(tooLong('a'.repeat(1e6), undefined)).toBeUndefined()
  })
})

describe('counterFor', () => {
  it('counts only the long texts', () => {
    expect(counterFor('abc', 5000)).toEqual({ used: 3, max: 5000 })
    expect(counterFor('abc', 150)).toBeUndefined()
    expect(isLongText(150)).toBe(false)
    expect(isLongText(1000)).toBe(true)
  })
})
