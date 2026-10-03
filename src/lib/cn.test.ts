import { describe, it, expect } from 'vitest'
import { cn } from './cn'

describe('cn', () => {
  it('lets a later class override an earlier one, tokens included', () => {
    expect(cn('bg-canvas text-ink', 'bg-accent-strong')).toBe('text-ink bg-accent-strong')
    expect(cn('text-sm text-ink', 'text-ink-muted')).toBe('text-sm text-ink-muted')
    expect(cn('rounded-control', 'rounded-none')).toBe('rounded-none')
  })

  it('drops falsy values', () => {
    expect(cn('a', false, undefined, null, 'b')).toBe('a b')
  })
})
