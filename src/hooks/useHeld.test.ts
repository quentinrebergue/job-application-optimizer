import { describe, it, expect } from 'vitest'
import { renderToString } from 'react-dom/server'
import { createElement } from 'react'
import { useHeld } from './useHeld'

// The hook is made of React state and a timer; what can be checked without a browser is what it gives at first render.
function first<T>(value: T | undefined): T | undefined {
  let seen: T | undefined
  function Probe() {
    seen = useHeld(value, 400)
    return null
  }
  renderToString(createElement(Probe))
  return seen
}

describe('useHeld', () => {
  it('gives the value it is given, and nothing when there is none', () => {
    expect(first('entry')).toBe('entry')
    expect(first<string>(undefined)).toBeUndefined()
  })
})
