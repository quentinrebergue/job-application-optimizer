import { describe, it, expect } from 'vitest'
import { APPLICATION_STATUSES, APPLICATION_STATUS_BADGES, APPLICATION_STATUS_LABELS } from './constants'

const BADGE_VARIANTS = ['neutral', 'muted', 'info', 'success', 'warning']

describe('application statuses', () => {
  it('every status has its own readable label', () => {
    const labels = APPLICATION_STATUSES.map((status) => APPLICATION_STATUS_LABELS[status])
    for (const label of labels) expect(label, 'a label').toMatch(/^[A-Z][a-z]+/)
    expect(new Set(labels).size, 'two statuses share a label').toBe(APPLICATION_STATUSES.length)
  })

  it('every status has a badge variant the Badge component knows', () => {
    for (const status of APPLICATION_STATUSES) expect(BADGE_VARIANTS, status).toContain(APPLICATION_STATUS_BADGES[status])
  })

  it('has no label or badge for a status that does not exist (a leftover after a rename)', () => {
    expect(Object.keys(APPLICATION_STATUS_LABELS).sort()).toEqual([...APPLICATION_STATUSES].sort())
    expect(Object.keys(APPLICATION_STATUS_BADGES).sort()).toEqual([...APPLICATION_STATUSES].sort())
  })
})
