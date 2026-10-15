import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import { cn } from './cn'

describe('cn', () => {
  it('lets a later class override an earlier one, tokens included', () => {
    expect(cn('bg-canvas text-ink', 'bg-accent-strong')).toBe('text-ink bg-accent-strong')
    expect(cn('text-sm text-ink', 'text-ink-muted')).toBe('text-sm text-ink-muted')
    expect(cn('rounded-control', 'rounded-none')).toBe('rounded-none')
    expect(cn('shadow-hard', 'hover:shadow-none', 'shadow-none')).toBe('hover:shadow-none shadow-none')
  })

  it('knows the spacing roles: a role replaces another or a raw value of the same property', () => {
    expect(cn('p-card', 'p-panel')).toBe('p-panel')
    expect(cn('gap-field', 'gap-3')).toBe('gap-3')
    expect(cn('gap-3', 'gap-heading')).toBe('gap-heading')
    expect(cn('p-card', 'gap-stack')).toBe('p-card gap-stack')
  })

  it('drops falsy values', () => {
    expect(cn('a', false, undefined, null, 'b')).toBe('a b')
  })

  it('knows every spacing role declared in globals.css (a role missing there would not be merged)', () => {
    const css = fs.readFileSync('src/app/globals.css', 'utf8')
    const roles = [...css.matchAll(/^\s*--spacing-([a-z-]+):/gm)].map((m) => m[1]).filter((r) => r !== 'press')
    expect(roles.length).toBeGreaterThan(5)
    for (const role of roles) expect(cn(`gap-${role}`, 'gap-3')).toBe('gap-3')
  })
})
