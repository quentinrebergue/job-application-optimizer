import { describe, it, expect } from 'vitest'
import { countSyntax } from './syntax'

describe('countSyntax', () => {
  it('counts braces, brackets, colons, commas and the quotes of keys and texts', () => {
    // {"a":[1,2]} -> { " " : [ , ] }  = 8 structural characters out of 11
    expect(countSyntax({ a: [1, 2] })).toEqual({ total: 11, syntax: 8 })
  })

  it('does not count what is inside a text, even a comma or a colon', () => {
    // {"k":"a,b:c"} -> { " " : " " }  = 7 out of 13 (the comma and the colon inside the text are content)
    expect(countSyntax({ k: 'a,b:c' })).toEqual({ total: 13, syntax: 7 })
  })

  it('keeps an escaped quote as content', () => {
    expect(countSyntax('say "hi"')).toEqual({ total: 12, syntax: 2 })
  })

  it('handles an empty value', () => {
    expect(countSyntax(undefined)).toEqual({ total: 0, syntax: 0 })
  })
})
