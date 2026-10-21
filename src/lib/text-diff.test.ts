import { describe, it, expect } from 'vitest'
import { diffWords } from './text-diff'

const join = (parts: { text: string }[]) => parts.map((p) => p.text).join('')
const changed = (parts: { text: string; changed: boolean }[]) => parts.filter((p) => p.changed).map((p) => p.text.trim())

describe('diffWords', () => {
  it('marks the words that are not in the other text, and puts the text back together', () => {
    const parts = diffWords('Backend developer. Go and Python.', 'Platform developer. Go and Python.')
    expect(join(parts)).toBe('Platform developer. Go and Python.')
    expect(changed(parts)).toEqual(['Platform'])
  })

  it('keeps one part for a run of new words, and marks words added at the end', () => {
    const parts = diffWords('Engineering student', 'Engineering student in site reliability')
    expect(changed(parts)).toEqual(['in site reliability'])
    const dotted = diffWords('Engineering student.', 'Engineering student in site reliability.')
    expect(join(dotted)).toBe('Engineering student in site reliability.')
    expect(changed(dotted)).toEqual(['in site reliability'])
  })

  it('marks nothing for the same text, and everything for an unrelated one', () => {
    expect(changed(diffWords('Same text', 'Same text'))).toEqual([])
    expect(changed(diffWords('one two', 'three four'))).toEqual(['three four'])
  })

  it('handles an empty text on either side, and line breaks', () => {
    expect(changed(diffWords('', 'new text'))).toEqual(['new text'])
    expect(diffWords('old', '')).toEqual([])
    const parts = diffWords('a b\nc', 'a x\nc')
    expect(join(parts)).toBe('a x\nc')
    expect(changed(parts)).toEqual(['x'])
  })
})
