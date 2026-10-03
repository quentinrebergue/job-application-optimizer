import { describe, it, expect } from 'vitest'
import { APPLICATION_STATUSES, APPLICATION_STATUS_BADGES, APPLICATION_STATUS_LABELS } from './constants'

describe('application statuses', () => {
  it('every status has a label and a badge variant', () => {
    for (const status of APPLICATION_STATUSES) {
      expect(APPLICATION_STATUS_LABELS[status]).toBeTruthy()
      expect(APPLICATION_STATUS_BADGES[status]).toBeTruthy()
    }
  })
})
