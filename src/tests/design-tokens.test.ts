/**
 * design-tokens.test.ts
 *
 * Components must be styled with the semantic tokens defined in
 * src/app/globals.css (bg-canvas, text-ink, border-line, bg-accent-strong...),
 * not with raw palette classes (bg-slate-50, text-blue-600) or arbitrary colours
 * (bg-[#fff]). See docs/design/frontend-guidelines.md.
 *
 * The app is being migrated page by page, so this is a ratchet: each file may
 * keep the number of raw classes it had in design-tokens.baseline.json, never
 * more, and the baseline must shrink as files are migrated.
 *
 * After a migration, record the progress with:
 *   UPDATE_DESIGN_BASELINE=1 npx vitest run src/tests/design-tokens.test.ts
 */

import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

const ROOT = path.resolve(__dirname, '../../')
const SRC = path.join(ROOT, 'src')
const BASELINE_FILE = path.join(__dirname, 'design-tokens.baseline.json')

const COLOR_UTILITIES =
  '(?:bg|text|border(?:-[trblxy])?|ring|outline|divide|fill|stroke|from|via|to|decoration|placeholder|accent|caret|shadow)'
const PALETTES =
  '(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)'
const RAW_COLOR = new RegExp(
  `\\b${COLOR_UTILITIES}-${PALETTES}-\\d{2,3}(?:/\\d+)?\\b|\\b${COLOR_UTILITIES}-\\[#[0-9a-fA-F]{3,8}\\]`,
  'g',
)

function collectTsxFiles(dir: string, files: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) collectTsxFiles(full, files)
    else if (entry.isFile() && entry.name.endsWith('.tsx')) files.push(full)
  }
  return files
}

function countRawColors(file: string): number {
  return (fs.readFileSync(file, 'utf8').match(RAW_COLOR) ?? []).length
}

const counts: Record<string, number> = {}
for (const file of collectTsxFiles(SRC)) {
  const n = countRawColors(file)
  if (n > 0) counts[path.relative(ROOT, file)] = n
}

if (process.env.UPDATE_DESIGN_BASELINE === '1') {
  const sorted = Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)))
  fs.writeFileSync(BASELINE_FILE, JSON.stringify(sorted, null, 2) + '\n')
}

const baseline: Record<string, number> = JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8'))

describe('design tokens: no new raw palette classes (ratchet)', () => {
  const files = new Set([...Object.keys(counts), ...Object.keys(baseline)])
  for (const rel of [...files].sort()) {
    it(rel, () => {
      const actual = counts[rel] ?? 0
      const allowed = baseline[rel] ?? 0
      expect(
        actual,
        `${rel} has ${actual} raw colour classes (allowed: ${allowed}). Use the tokens from globals.css.`,
      ).toBeLessThanOrEqual(allowed)
      expect(
        actual,
        `${rel} has fewer raw colour classes than its baseline (${allowed}): record the progress with UPDATE_DESIGN_BASELINE=1.`,
      ).toBeGreaterThanOrEqual(allowed)
    })
  }
})
