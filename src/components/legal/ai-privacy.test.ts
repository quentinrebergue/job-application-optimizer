import { describe, it, expect } from 'vitest'
import { AI_ON_MISTRAL, AI_TRAINING_OPTED_OUT } from '@/config/legal'
import { aiPrivacy, importNotice, importPrivacy } from './ai-privacy'

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

  it('says what is recorded for each AI call, why, for how long, and what happens when the account is deleted (#213)', () => {
    const text = aiPrivacy(on).join(' ')
    expect(text).toMatch(/record, on our side, the date, the model, the number of tokens and the cost, never the content/)
    expect(text).toMatch(/limits per person and the monthly budget/)
    expect(text).toMatch(/current and the previous month/)
    expect(text).toMatch(/replaced by a total \(calls, tokens, cost\) with no identity in it/)
    expect(text).toMatch(/delete your account, your records stay until then without your identity/)
  })

  it('says nothing of records while there is no AI feature, since nothing is recorded', () => {
    expect(aiPrivacy({ ...on, onMistral: false }).join(' ')).not.toMatch(/record|tokens/)
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

describe('importPrivacy and importNotice (#110)', () => {
  it('says what is taken out by code and what goes to Mistral, and that the file is not kept', () => {
    const text = importPrivacy(on).join(' ')
    expect(text).toMatch(/name, your email address, your phone number, the links to your profiles .* and your date of birth/)
    expect(text).toMatch(/never sent to the AI/)
    expect(text).toMatch(/may escape it/)
    expect(text).toMatch(/sent to Mistral AI/)
    expect(text).toMatch(/Neither the PDF nor its text is kept/)
    expect(importPrivacy({ ...on, onMistral: false })).toEqual([])
  })

  it('does not claim more than the settings do', () => {
    expect(importNotice({ ...on, zeroRetention: false })).toMatch(/keeps it for a limited time to watch for abuse/)
    expect(importNotice({ ...on, zeroRetention: true })).toMatch(/does not keep it/)
    expect(importNotice({ ...on, trainingOptedOut: false })).not.toMatch(/does not train/)
    expect(importNotice(on)).toMatch(/does not train on it/)
  })
})
