import { describe, it, expect } from 'vitest'
import { softBreaks } from './soft-breaks'

const ZWSP = '​'

describe('softBreaks', () => {
  it('leaves ordinary text exactly as it was written: long sentences, the longest English word, an identifier of 60 characters', () => {
    const text = 'Led the national team of 67 TAs and supervised 5 intensive coding bootcamps. Pneumonoultramicroscopicsilicovolcanoconiosis.'
    expect(softBreaks(text)).toBe(text)
    expect(softBreaks('a'.repeat(60))).toBe('a'.repeat(60))
    expect(softBreaks('')).toBe('')
  })

  it('breaks a run of 61 characters or more every 40 characters, so a line can end inside it', () => {
    expect(softBreaks('a'.repeat(61))).toBe(`${'a'.repeat(40)}${ZWSP}${'a'.repeat(21)}`)
    expect(softBreaks('b'.repeat(130))).toBe([40, 40, 40, 10].map((n) => 'b'.repeat(n)).join(ZWSP))
  })

  it('only touches the long word, not the text around it', () => {
    const word = 'x'.repeat(90)
    expect(softBreaks(`before ${word} after`)).toBe(`before ${'x'.repeat(40)}${ZWSP}${'x'.repeat(40)}${ZWSP}${'x'.repeat(10)} after`)
  })

  it('does not break what already wraps by itself: a URL or a compound word with slashes and hyphens', () => {
    const url = 'https://github.com/quentinrebergue/job-application-optimizer/blob/master/README.md'
    expect(softBreaks(url)).toBe(url)
    const compound = 'state-of-the-art-high-performance-low-latency-distributed-systems-engineering'
    expect(softBreaks(compound)).toBe(compound)
  })

  it('breaks inside a long segment of a URL, between two slashes', () => {
    const out = softBreaks(`https://example.com/${'z'.repeat(100)}/end`)
    expect(out).toContain(ZWSP)
    expect(out.replaceAll(ZWSP, '')).toBe(`https://example.com/${'z'.repeat(100)}/end`)
  })

  it('does not change the text once the breaks are removed, whatever the characters', () => {
    const text = `${'é'.repeat(90)} ${'0123456789'.repeat(12)} ${'🙂'.repeat(70)}`
    expect(softBreaks(text).replaceAll(ZWSP, '')).toBe(text)
  })

  it('never cuts an emoji or a letter from its accent', () => {
    const out = softBreaks('🙂'.repeat(100))
    for (const piece of out.split(ZWSP)) expect(Array.from(piece).every((c) => c === '🙂')).toBe(true)
    const accented = softBreaks('é'.repeat(45))
    for (const piece of accented.split(ZWSP)) expect(piece.startsWith('́')).toBe(false)
  })

  it('gives the same text when it runs twice', () => {
    const once = softBreaks('a'.repeat(200))
    expect(softBreaks(once)).toBe(once)
  })

  it('leaves Chinese and Japanese alone: they break between characters by themselves', () => {
    const cjk = '日本語のテキスト'.repeat(10)
    expect(softBreaks(cjk)).toBe(cjk)
  })
})
