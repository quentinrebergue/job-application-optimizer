import { describe, it, expect } from 'vitest'
import { formatDate } from './format'

describe('formatDate', () => {
  it('formats in UTC, so a date near midnight does not shift with the time zone', () => {
    expect(formatDate('2026-09-24T23:30:00.000Z')).toBe('24 Sept 2026')
    expect(formatDate('2026-09-24T00:10:00.000Z', 'long')).toBe('24 September 2026')
  })
})
