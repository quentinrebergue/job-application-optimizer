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

  it('take their values from the two scales (spacing 4 8 12 16 24 32 48 64 96, text 12 14 16 18 20 24 32 36 48 72)', () => {
    const SPACING = [4, 8, 12, 16, 24, 32, 48, 64, 96]
    const TEXT = [12, 14, 16, 18, 20, 24, 32, 36, 48, 72]
    const px = (v: string) => (v.endsWith('rem') ? parseFloat(v) * 16 : parseFloat(v))
    const off: string[] = []
    for (const m of css.matchAll(/^\s*--spacing-([a-z-]+):\s*([\d.]+(?:rem|px))/gm)) {
      if (m[1] !== 'press' && !SPACING.includes(px(m[2]))) off.push(`--spacing-${m[1]}: ${m[2]}`)
    }
    for (const m of css.matchAll(/^\s*--text-([a-z-]+):\s*([\d.]+rem)/gm)) {
      if (!m[1].includes('--') && !TEXT.includes(px(m[2]))) off.push(`--text-${m[1]}: ${m[2]}`)
    }
    expect(off).toEqual([])
  })

  it('are all shown in the UI catalogue, so a role is seen where it is chosen', () => {
    const catalogue = fs.readFileSync('src/components/catalogue/UiCatalogue.tsx', 'utf8')
    const missing = [...spacing.filter((r) => r !== 'press').map((r) => `spacing ${r}`), ...text.filter((t) => !t.includes('--')).map((t) => `text ${t}`)]
      .filter((entry) => !catalogue.includes(`'${entry.split(' ')[1]}'`))
    expect(missing).toEqual([])
  })
})
