import { describe, it, expect } from 'vitest'
import { AI_ON_MISTRAL, AI_TRAINING_OPTED_OUT } from '@/config/legal'
import { aiPrivacy } from './ai-privacy'

const on = { onMistral: true, trainingOptedOut: true, zeroRetention: false }

describe('aiPrivacy', () => {
  it('says the AI is not available while it is not on Mistral, and names no provider', () => {
    const text = aiPrivacy({ ...on, onMistral: false }).join(' ')
    expect(text).toMatch(/not available yet/)
    expect(text).not.toMatch(/Mistral|OVHcloud/)
  })

  it('names the provider, what is sent and what is not', () => {
    const text = aiPrivacy(on).join(' ')
    expect(text).toMatch(/sent to Mistral AI, a French company based in Paris/)
    expect(text).toMatch(/not your name, your email address or your phone number/)
    expect(text).toMatch(/never its US one/)
  })

  it('does not claim the requests are not stored unless zero data retention is approved', () => {
    expect(aiPrivacy({ ...on, zeroRetention: false }).join(' ')).toMatch(/abuse monitoring.*may be kept/)
    expect(aiPrivacy({ ...on, zeroRetention: false }).join(' ')).not.toMatch(/does not store/)
    expect(aiPrivacy({ ...on, zeroRetention: true }).join(' ')).toMatch(/does not store or log/)
  })

  it('does not claim the opt-out of training unless it is set', () => {
    expect(aiPrivacy({ ...on, trainingOptedOut: true }).join(' ')).toMatch(/opted out of training/)
    const text = aiPrivacy({ ...on, trainingOptedOut: false }).join(' ')
    expect(text).not.toMatch(/opted out of training/)
    expect(text).toMatch(/unless the customer opts out/)
  })
})

describe('the real flags', () => {
  it('never put the AI on Mistral before the opt-out of training is confirmed', () => {
    expect(!AI_ON_MISTRAL || AI_TRAINING_OPTED_OUT).toBe(true)
  })
})
