import { describe, it, expect, afterEach, vi } from 'vitest'
import { envNumber } from './env'

afterEach(() => vi.unstubAllEnvs())

describe('envNumber', () => {
  it('reads a positive whole number', () => {
    vi.stubEnv('X_LIMIT', '12')
    expect(envNumber('X_LIMIT', 5)).toBe(12)
  })

  it('takes the default when the variable is not set', () => {
    expect(envNumber('X_NOT_SET', 5)).toBe(5)
  })

  it.each(['', 'abc', '0', '-3', '2.5', 'NaN', 'Infinity'])('falls back for %j, so a typo cannot switch a limit off', (value) => {
    vi.stubEnv('X_LIMIT', value)
    expect(envNumber('X_LIMIT', 5)).toBe(5)
  })

  it('accepts a decimal when asked to (an amount in euros)', () => {
    vi.stubEnv('X_CAP', '2.5')
    expect(envNumber('X_CAP', 3, false)).toBe(2.5)
    vi.stubEnv('X_CAP', '-1')
    expect(envNumber('X_CAP', 3, false)).toBe(3)
  })
})
