import { describe, it, expect } from 'vitest'
import { aiStatement } from './ai-copy'

describe('aiStatement', () => {
  it('says only the honest-AI rule while the AI is not on Mistral', () => {
    const text = aiStatement({ onMistral: false, trainingOptedOut: true }).join(' ')
    expect(text).toContain('never invents')
    expect(text).not.toMatch(/Mistral|opted out|OVHcloud/)
  })

  it('names the provider once the AI runs on it, without claiming the opt-out until it is set', () => {
    const text = aiStatement({ onMistral: true, trainingOptedOut: false }).join(' ')
    expect(text).toMatch(/Mistral AI, a French company, in Europe/)
    expect(text).toMatch(/name and contact details are never sent/)
    expect(text).not.toMatch(/opted out|train/)
  })

  it('adds the training opt-out only when it is set', () => {
    expect(aiStatement({ onMistral: true, trainingOptedOut: true })).toHaveLength(3)
  })
})
