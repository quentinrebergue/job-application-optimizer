/**
 * design-tokens.test.ts
 *
 * Components must be styled with the semantic tokens defined in
 * src/app/globals.css (bg-canvas, text-ink, border-line, bg-accent-strong...),
 * not with raw palette classes (bg-slate-50, text-blue-600) or arbitrary colours
 * (bg-[#fff]). See docs/design/frontend-guidelines.md.
 *
 * Checked on every .ts and .tsx file of src/ (class strings also live in .ts
 * files such as components/ui/styles.ts).
 */

import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

const ROOT = path.resolve(__dirname, '../../')
const SRC = path.join(ROOT, 'src')

const COLOR_UTILITIES =
  '(?:bg|text|border(?:-[trblxy])?|ring|outline|divide|fill|stroke|from|via|to|decoration|placeholder|accent|caret|shadow)'
const PALETTES =
  '(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)'
const RAW_COLOR = new RegExp(
  `\\b${COLOR_UTILITIES}-${PALETTES}-\\d{2,3}(?:/\\d+)?\\b|\\b${COLOR_UTILITIES}-\\[#[0-9a-fA-F]{3,8}\\]`,
  'g',
)

function collectSourceFiles(dir: string, files: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) collectSourceFiles(full, files)
    else if (entry.isFile() && /\.tsx?$/.test(entry.name) && !entry.name.endsWith('.test.ts')) files.push(full)
  }
  return files
}

describe('design tokens: no raw palette classes', () => {
  for (const file of collectSourceFiles(SRC)) {
    const rel = path.relative(ROOT, file)
    it(rel, () => {
      const found = fs.readFileSync(file, 'utf8').match(RAW_COLOR) ?? []
      expect(found, `${rel} uses raw colour classes: ${found.join(', ')}. Use the tokens from globals.css.`).toEqual([])
    })
  }
})
