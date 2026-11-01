import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it, expect } from 'vitest'

// The README of a folder lists what is in it, one line each (docs/charter.md, "How the work is organised"). A list that is
// not checked drifts: this test fails when a file or a folder is missing from the README of its folder, or when a README names
// something that is not there any more. Naming a path inside a folder (`internal/api/`) counts as naming the folder. Folders opt in below; a README written as prose (docs/, eval/, load/) is not checked.

const root = process.cwd()
const tracked = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  .split('\n')
  .filter(Boolean)

/** The folders whose README is a table of their entries. */
const CHECKED = [
  '.github', 'docs', 'docs/design', 'k8s', 'scripts', 'db', 'ansible', 'terraform',
  'services', 'services/ai-gateway', 'services/db-migrator', 'services/password-hasher', 'services/pdf-text', 'services/resume-renderer',
  'src', 'src/app', 'src/app/api', 'src/app/actions', 'src/components', 'src/components/account', 'src/components/auth',
  'src/components/entities', 'src/components/jobs', 'src/components/landing', 'src/components/layout', 'src/components/legal',
  'src/components/resume', 'src/components/ui', 'src/config', 'src/emails', 'src/hooks', 'src/lib', 'src/lib/ai', 'src/lib/data',
  'src/schemas', 'src/tests', 'src/types',
]

/** A test sits next to what it tests: it is covered by one sentence of the README, not listed one by one. */
const isTest = (name: string) => /\.test\.(ts|tsx|mjs)$|_test\.go$/.test(name) || name === 'testdata'

function entriesOf(folder: string): string[] {
  const prefix = folder === '.' ? '' : `${folder}/`
  const names = new Set<string>()
  for (const file of tracked) if (file.startsWith(prefix)) names.add(file.slice(prefix.length).split('/')[0])
  return [...names].sort()
}

const readme = (folder: string) => fs.readFileSync(path.join(root, folder, 'README.md'), 'utf8')

describe.each(CHECKED)('the README of %s', (folder) => {
  const text = readme(folder)

  it('lists every file and folder it holds (tests aside)', () => {
    const missing = entriesOf(folder).filter((name) => name !== 'README.md' && !isTest(name) && !text.includes(`\`${name}\``) && !text.includes(`\`${name}/`))
    expect(missing, `not in ${folder}/README.md`).toEqual([])
  })

  it('names nothing that is not there', () => {
    // The first cell of a table row: `name` or `path/to/name`.
    const named = [...text.matchAll(/^\|\s*`([^`]+)`/gm)].map((m) => m[1].replace(/\/$/, ''))
    const gone = named.filter((name) => !/[\s*{}<>()]/.test(name) && !fs.existsSync(path.join(root, folder, name)))
    expect(gone, `in ${folder}/README.md but not on disk`).toEqual([])
  })
})
