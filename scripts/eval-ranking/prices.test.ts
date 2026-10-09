import { describe, it, expect } from 'vitest'
import { costOf } from './prices'

describe('costOf', () => {
  it('prices input and output separately', () => {
    // Medium: 2691 tokens in at 1.28, 954 out at 6.38 (euros per million)
    expect(costOf('mistral-medium-2604', 2691, 954)).toBeCloseTo(0.00953, 5)
    expect(costOf('mistral-small-2603', 2691, 895)).toBeCloseTo(0.00081, 5)
  })

  it('ignores the case of the model name', () => {
    expect(costOf('Meta-Llama-3_3-70B-Instruct', 1_000_000, 0)).toBeCloseTo(0.67)
  })

  it('has no cost for an unknown model', () => {
    expect(costOf('some-new-model', 1000, 1000)).toBeNull()
    expect(costOf(undefined, 1000, 1000)).toBeNull()
  })
})
