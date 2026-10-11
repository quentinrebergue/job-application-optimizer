/**
 * file-length.test.ts
 *
 * Enforces a 400-line limit on all TypeScript source files (.ts and .tsx) in src/.
 * This keeps files focused and forces logic to be split into multiple units.
 *
 * One test that lists every file over the limit (not one test per file): the failure says which
 * files at once, and the test count stays a count of behaviours (#220).
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
    } else if (entry.isFile() && /\.tsx?$/.test(entry.name) && !entry.name.endsWith('.d.ts')) {
      files.push(full)
    }
  }
  return files
}

const allFiles = collectTsFiles(path.join(ROOT, 'src'))
const lines = (file: string) => fs.readFileSync(file, 'utf8').split('\n').length

describe('file length limit (max 400 lines)', () => {
  it('finds the source files (a scan that finds nothing proves nothing)', () => {
    expect(allFiles.length).toBeGreaterThan(150)
  })

  it('has no file over the limit', () => {
    const tooLong = allFiles
      .map((file) => ({ file: path.relative(ROOT, file), count: lines(file) }))
      .filter(({ count }) => count > MAX_LINES)
      .map(({ file, count }) => `${file} has ${count} lines`)
    expect(tooLong, `files over ${MAX_LINES} lines (split them)`).toEqual([])
  })
})
