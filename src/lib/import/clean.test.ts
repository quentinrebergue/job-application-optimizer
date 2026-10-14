import { describe, it, expect } from 'vitest'
import { cleanText } from './clean'

describe('cleanText', () => {
  it('drops the lines that are only debris: punctuation, a page number, the tail of a letter', () => {
    const text = ['Education', ',', ', , , , ,', '‘ ‘', '’', '1', 'p', 'th', '・', 'EPITA'].join('\n')
    expect(cleanText(text)).toBe('Education\nEPITA')
  })

  it('takes the loose commas and quotes out of a line, and keeps one space between words', () => {
    expect(cleanText('C# C C++   python , , Ocaml')).toBe('C# C C++ python Ocaml')
    expect(cleanText('’ Computer Science Masters student')).toBe('Computer Science Masters student')
  })

  it('keeps what means something: a bullet, a dash between dates, a lone capital, punctuation inside words', () => {
    const text = ['• Built an API in Go', 'Sep 24 - Jan 25', 'C', 'Paris, France', 'TOEIC 975/990', '2021 – 2026']
    expect(cleanText(text.join('\n'))).toBe(text.join('\n'))
  })

  it('gives an empty text for a text of debris', () => {
    expect(cleanText(', ,\n\n’')).toBe('')
  })
})
