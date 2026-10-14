import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// The roles of globals.css (--spacing-*, --text-*) become Tailwind utilities by name: `--spacing-block` once made
// `inline-block` mean `inline-size: 1rem`, which crushed the landing page. A role name must not be the value of
// another utility: every class that ends with a role name is checked against the utilities meant to take it.

const css = fs.readFileSync('src/app/globals.css', 'utf8')
const spacing = [...css.matchAll(/^\s*--spacing-([a-z-]+):/gm)].map((m) => m[1])
const text = [...css.matchAll(/^\s*--text-([a-z-]+):/gm)].map((m) => m[1])

// Utilities that read the spacing scale too (width, height, position...) or have a keyword value of their own
// (`inline-block`, `block-size`): a role name after one of them is a collision, not a use.
const SCALE_UTILITIES = /^-?(inline|block|w|h|size|min-w|max-w|min-h|max-h|top|bottom|left|right|inset|inset-x|inset-y|start|end|basis|leading|indent|scroll-m|scroll-p|divide-x|divide-y|border-spacing|flex|grid|table|list|columns|order|col|row|auto-cols|auto-rows|outline-offset|underline-offset)$/

function sources(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) return sources(p)
    return /\.tsx?$/.test(e.name) && !e.name.includes('.test.') ? [p] : []
  })
}

describe('the roles of globals.css', () => {
  it('are found', () => {
    expect(spacing.length).toBeGreaterThan(8)
    expect(text.filter((t) => !t.includes('--')).length).toBeGreaterThan(5)
  })

  it('are not the value of another utility (a class ending with a role name is one that takes it)', () => {
    const names = [...spacing, ...text.filter((t) => !t.includes('--'))].join('|')
    const rx = new RegExp(`(?<![\\w-])((?:[a-z0-9]+:)*)(-?[a-z]+(?:-[a-z]+)*?)-(${names})(?![\\w-])`, 'g')
    const bad: string[] = []
    for (const file of sources('src')) {
      for (const m of fs.readFileSync(file, 'utf8').matchAll(rx)) {
        const [, , prefix, name] = m
        // `flex-row`, `grid-flow-row`... are keywords of those utilities, not a role: the roles `row`/`label` are only
        // read after the spacing utilities.
        if (SCALE_UTILITIES.test(prefix) && spacing.includes(name) && !(prefix === 'flex' && name === 'row')) bad.push(`${file}: ${prefix}-${name}`)
      }
    }
    expect(bad).toEqual([])
  })
})
