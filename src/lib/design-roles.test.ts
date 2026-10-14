import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// The guard of the design roles (globals.css): in the app, a gap, padding, margin or text style that has a role
// is written with the role, never with a raw number. A raw value fails this test, so "it is the same everywhere"
// does not rest on anyone's review. The marketing pages (landing, legal) and the component catalogue keep their own scale.
//
// Not covered by a role, so left raw: 1, 1.5 and 2 (an icon beside its text, a chip row, a hairline), sizes of controls
// (h-*, w-*), and the weights used inside a sentence (font-semibold on a name).

const OUT_OF_SCOPE = ['src/components/landing', 'src/components/legal', 'src/components/catalogue', 'src/app/(public)/welcome', 'src/app/(public)/legal']

// Raw values that stay, each with its reason. A line is `file: class`.
const ALLOWED = new Set<string>([
  // The brand name, a logo more than text.
  'src/components/layout/Wordmark.tsx: text-base',
  // The size of a big button on the job page (a control size, not a text role).
  'src/components/jobs/ResumeConfigPanel.tsx: sm:text-base',
  // The +/- glyph of a disclosure, an icon in a box.
  'src/components/ui/Disclosure.tsx: text-lg',
  // Skip-to-content link, shown on focus only.
  'src/app/(app)/layout.tsx: focus:text-sm',
  'src/app/(public)/layout.tsx: focus:text-sm',
  'src/app/(app)/layout.tsx: focus:px-3',
  'src/app/(public)/layout.tsx: focus:px-3',
  // The width of a big button on the job page, and the links of the top bar (tighter on a phone).
  'src/components/jobs/ResumeConfigPanel.tsx: sm:px-5',
  'src/components/layout/AppHeader.tsx: sm:px-3',
  // Room for an empty list's message, and for the arrow inside a select (an icon's room, not a role).
  'src/components/jobs/JobsClient.tsx: p-10',
  'src/components/ui/Input.tsx: pr-8',
  'src/components/ui/SelectMenu.tsx: pr-8',
])

const RAW = new RegExp(
  '(?<![\\w-])((?:[a-z-]+:)*)(' +
    [
      'text-(?:xs|sm|base|lg|xl|[2-9]xl)',
      '(?:gap|gap-x|gap-y|space-x|space-y)-(?:3|4|5|6|7|8|9|10|11|12|14|16)',
      '-?(?:p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr)-(?:3|4|5|6|7|8|9|10|11|12|14|16)',
    ].join('|') +
    ')(?![\\w.-])',
  'g',
)

function sources(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name)
    if (OUT_OF_SCOPE.some((o) => p.startsWith(o))) return []
    if (e.isDirectory()) return sources(p)
    return e.name.endsWith('.tsx') && !e.name.includes('.test.') ? [p] : []
  })
}

describe('the design roles', () => {
  it('replace every raw gap, padding, margin and text size in the app', () => {
    const raw: string[] = []
    for (const file of sources('src')) {
      for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
        // Code only: a comment may name a class.
        if (/^\s*(\/\/|\*|\/\*)/.test(line)) continue
        for (const m of line.matchAll(RAW)) {
          const entry = `${file}: ${m[1]}${m[2]}`
          if (!ALLOWED.has(entry)) raw.push(entry)
        }
      }
    }
    // A role to use instead is in docs/design/identity.md (Spacing, Text styles).
    expect([...new Set(raw)].sort()).toEqual([])
  })

  it('keep the weight and the capitals of titles and labels in their roles', () => {
    // font-extrabold is the weight of a title role (text-title, text-item...); tracking and capitals are the eyebrow's.
    // What is left is emphasis inside a line, or a logo.
    const ALLOWED_HEAVY = new Set([
      'src/components/layout/Wordmark.tsx',
      'src/components/layout/SiteFooter.tsx',
      'src/components/layout/AppHeader.tsx',
      'src/components/layout/StatusPage.tsx',
      'src/components/layout/AccountMenu.tsx',
      // A colour code shown in capitals: data, not a label.
      'src/components/resume/TemplatePicker.tsx',
    ])
    const found: string[] = []
    for (const file of sources('src')) {
      if (file.endsWith('ui/styles.ts')) continue
      for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
        if (/^\s*(\/\/|\*|\/\*)/.test(line)) continue
        if (/(?<![\w-])font-extrabold(?![\w-])/.test(line) && !ALLOWED_HEAVY.has(file)) found.push(`${file}: font-extrabold`)
        if (/(?<![\w-])(uppercase|tracking-(tight|tighter|wide|wider|widest))(?![\w-])/.test(line) && !ALLOWED_HEAVY.has(file)) found.push(`${file}: tracking or capitals`)
      }
    }
    expect([...new Set(found)].sort()).toEqual([])
  })

  it('give every section the page width: only a short text under a title has a narrower measure', () => {
    // max-w-page and max-w-measure are the two widths of content; max-w-sm to max-w-lg are the widths of a component
    // (a form card, a demo). A raw max-w-xl..7xl is a third, private width: the Why section once had its own.
    const found: string[] = []
    const all = (dir: string): string[] => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const p = path.join(dir, e.name)
      if (e.isDirectory()) return all(p)
      return e.name.endsWith('.tsx') && !e.name.includes('.test.') ? [p] : []
    })
    const ALLOWED_WIDTH = new Set([
      // A centred display heading, wider than a measure on purpose.
      'src/app/(public)/welcome/page.tsx: max-w-3xl',
      // The width of a drawer's column and of the sign-in cards are components, not sections.
      'src/components/ui/Drawer.tsx: max-w-2xl',
      // Dialogs are components: narrow by default, wide for a list.
      'src/components/ui/Modal.tsx: max-w-5xl',
      'src/components/ui/ResponsiveDialog.tsx: max-w-3xl',
      // A long text (the legal pages) keeps a width it can be read at.
      'src/components/legal/LegalPage.tsx: max-w-3xl',
    ])
    for (const file of all('src')) {
      for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
        if (/^\s*(\/\/|\*|\/\*)/.test(line)) continue
        for (const m of line.matchAll(/(?<![\w-])((?:[a-z-]+:)*max-w-(?:xl|2xl|3xl|4xl|5xl|6xl|7xl))(?![\w-])/g)) {
          const entry = `${file}: ${m[1]}`
          if (!ALLOWED_WIDTH.has(entry)) found.push(entry)
        }
      }
    }
    expect([...new Set(found)].sort()).toEqual([])
  })
})
