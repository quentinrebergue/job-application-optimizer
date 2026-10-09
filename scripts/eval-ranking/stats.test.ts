import { describe, it, expect } from 'vitest'
import { describePaired, paired } from './stats'

describe('paired', () => {
  it('counts the cases that got better, worse or stayed the same', () => {
    const p = paired([0.8, 0.8, 0.8, 0.8], [0.9, 0.9, 0.8, 0.7])!
    expect([p.better, p.worse, p.same, p.n]).toEqual([2, 1, 1, 4])
    expect(p.mean).toBeCloseTo(0.025)
  })

  it('gives a wide interval with few cases: 5 cases and a few points is not enough', () => {
    const p = paired([0.9, 0.8, 0.9, 0.67, 0.74], [0.8, 0.8, 0.8, 0.67, 0.78])!
    expect(p.low).toBeLessThan(0)
    expect(p.high).toBeGreaterThan(0)
    expect(describePaired(p)).toContain('could be chance')
  })

  it('calls an improvement real when every case improves by a similar amount', () => {
    const before = [0.7, 0.72, 0.68, 0.71, 0.69, 0.7, 0.73, 0.66]
    const p = paired(before, before.map((v) => v + 0.08))!
    expect(p.low).toBeGreaterThan(0)
    expect(describePaired(p)).toContain('probably real')
  })

  it('needs at least two cases', () => {
    expect(paired([0.5], [0.6])).toBeNull()
    expect(describePaired(null)).toContain('too few')
  })
})
