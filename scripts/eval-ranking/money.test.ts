import { describe, it, expect } from 'vitest'
import { averageShares, formatMoney } from './money'

describe('averageShares', () => {
  it('averages the share of each part, every case counting the same', () => {
    // case 1: a 3/4, b 1/4; case 2: a 1/2, b 1/2 -> a 0.625, b 0.375
    const shares = averageShares([{ a: 300, b: 100 }, { a: 5, b: 5 }])
    expect(shares).toEqual([['a', 0.625], ['b', 0.375]])
  })

  it('sorts the biggest first and ignores an empty case', () => {
    expect(averageShares([{ a: 1, b: 9 }, {}]).map(([name]) => name)).toEqual(['b', 'a'])
  })
})

describe('formatMoney', () => {
  const base = {
    model: 'm', price: { input: 1, output: 4 }, promptTokens: 2000, completionTokens: 500,
    inputShares: [['library', 0.75], ['offer', 0.25]] as [string, number][],
    outputShares: [['best', 1]] as [string, number][],
  }

  it('splits the cost between input and output and adds it up', () => {
    const text = formatMoney(base)
    // 1000 rankings: input 2000 tokens at 1 EUR/M = 2.00 EUR, output 500 at 4 = 2.00 EUR, total 4.00 EUR
    expect(text).toMatch(/INPUT \(the prompt\)\s+2000 tokens\s+2\.00 EUR\s+50%/)
    expect(text).toMatch(/OUTPUT \(the answer\)\s+500 tokens\s+2\.00 EUR\s+50%/)
    expect(text).toMatch(/library\s+1500 tokens\s+1\.50 EUR\s+38%/)
    expect(text).toContain('TOTAL 4.00 EUR for 1000 rankings, 0.0040 EUR each')
  })

  it('shows only tokens when the model has no price', () => {
    const text = formatMoney({ ...base, price: null })
    expect(text).toContain('Where the tokens go')
    expect(text).not.toContain('EUR')
  })
})
