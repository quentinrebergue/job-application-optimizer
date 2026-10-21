import { describe, it, expect } from 'vitest'
import { mismatchWarning, modelMismatch, sameModel } from './model-check'

describe('sameModel', () => {
  it('ignores the case and accepts a version suffix on either side', () => {
    expect(sameModel('mistral-small-2603', 'Mistral-Small-2603')).toBe(true)
    expect(sameModel('mistral-small', 'mistral-small-2603')).toBe(true)
    expect(sameModel('mistral-small-2603', 'mistral-small')).toBe(true)
  })

  it('tells two models apart, even when one name starts with the other', () => {
    expect(sameModel('mistral-small-2603', 'llama-3.1-8b')).toBe(false)
    expect(sameModel('mistral-small-2603', 'mistral-medium-2604')).toBe(false)
    expect(sameModel('mistral', 'mistral-small-2603')).toBe(true)
    expect(sameModel('mistral-small', 'mistralsmall')).toBe(false)
  })
})

describe('modelMismatch', () => {
  it('lists the models that answered and are not the one asked for, once each', () => {
    expect(modelMismatch('mistral-small-2603', ['mistral-small-2603', 'llama-3.1-8b', 'llama-3.1-8b'])).toEqual(['llama-3.1-8b'])
  })

  it('has nothing to say without --model, or when the gateway named nothing', () => {
    expect(modelMismatch(undefined, ['llama'])).toEqual([])
    expect(modelMismatch('mistral-small-2603', [])).toEqual([])
  })

  it('writes a warning that names both', () => {
    const text = mismatchWarning('mistral-small-2603', ['llama-3.1-8b'])
    expect(text).toContain('mistral-small-2603')
    expect(text).toContain('llama-3.1-8b')
  })
})
