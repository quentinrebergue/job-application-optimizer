import { describe, it, expect } from 'vitest'
import { aiStatement } from './ai-copy'

describe('aiStatement', () => {
  it('says only the honest-AI rule while the AI is not on OVHcloud', () => {
    const text = aiStatement({ onOvhcloud: false, anonymised: false }).join(' ')
    expect(text).toContain('never invents')
    expect(text).not.toMatch(/OVHcloud|removed/)
  })

  it('does not claim anonymisation without the OVHcloud AI, even if the flag is on', () => {
    expect(aiStatement({ onOvhcloud: false, anonymised: true }).join(' ')).not.toMatch(/removed|OVHcloud/)
  })

  it('adds the hosting sentence, then the anonymisation one, as they become true', () => {
    expect(aiStatement({ onOvhcloud: true, anonymised: false })).toHaveLength(2)
    expect(aiStatement({ onOvhcloud: true, anonymised: true }).join(' ')).toMatch(/OVHcloud.*removed/)
  })
})
