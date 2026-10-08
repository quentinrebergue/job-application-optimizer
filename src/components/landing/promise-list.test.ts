import { describe, it, expect } from 'vitest'
import { ALL_PROMISES, PROMISES } from './promise-list'

describe('landing promises', () => {
  it('shows only the promises that are true today', () => {
    expect(PROMISES.every((promise) => !promise.blockedBy)).toBe(true)
    expect(PROMISES.length).toBeGreaterThan(0)
  })

  it('keeps the promises that are not true yet out of the page', () => {
    const waiting = ALL_PROMISES.filter((promise) => promise.blockedBy)
    expect(waiting.length).toBeGreaterThan(0)
    for (const promise of waiting) expect(PROMISES).not.toContain(promise)
  })

  it('names the ticket that unblocks each one', () => {
    for (const promise of ALL_PROMISES.filter((p) => p.blockedBy)) expect(promise.blockedBy).toMatch(/^#\d+$/)
  })
})
