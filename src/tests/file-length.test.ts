/**
 * file-length.test.ts
 *
 * Enforces a 400-line limit on all TypeScript source files in src/ and mcp/.
 * This keeps files focused and forces logic to be split into multiple units.
 */

import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

const MAX_LINES = 400
const ROOT = path.resolve(__dirname, '../../')

function collectTsFiles(dir: string, files: string[] = []): string[] {
  if (!fs.existsSync(dir)) return files
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      collectTsFiles(full, files)
    } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
      files.push(full)
    }
  }
  return files
}

const SEARCH_DIRS = [
  path.join(ROOT, 'src'),
  path.join(ROOT, 'mcp'),
]

const allFiles = SEARCH_DIRS.flatMap((d) => collectTsFiles(d))

describe('file length limit (max 400 lines)', () => {
  for (const file of allFiles) {
    const relPath = path.relative(ROOT, file)
    it(relPath, () => {
      const content = fs.readFileSync(file, 'utf8')
      const lineCount = content.split('\n').length
      expect(lineCount, `${relPath} has ${lineCount} lines (limit: ${MAX_LINES})`).toBeLessThanOrEqual(MAX_LINES)
    })
  }
})
