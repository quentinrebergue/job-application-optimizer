import fs from 'node:fs/promises'
import path from 'node:path'
import type { EntityMeta } from '@/types'
import type { Expected } from './metrics'

export interface EvalCase {
  name: string
  /** Not in the JSON: `example` for the versioned fictional cases, `private` for mine. */
  source: 'example' | 'private'
  job: { title: string; company: string; description: string }
  entities: { experiences: EntityMeta[]; projects: EntityMeta[]; skills: EntityMeta[]; education: EntityMeta[] }
  /** The ids I would pick for this offer: what the evaluation compares the AI with. */
  expected: Expected
}

const ROOT = path.resolve(process.cwd(), 'eval')
/** `cases` is versioned (fictional data); `private` is not (my real offers and library). */
export const PRIVATE_DIR = path.join(ROOT, 'private')
export const CASE_DIRS = [path.join(ROOT, 'cases'), PRIVATE_DIR]
export const RESULTS_DIR = path.join(ROOT, 'results')

export async function loadCases(): Promise<EvalCase[]> {
  const cases: EvalCase[] = []
  for (const dir of CASE_DIRS) {
    const source = dir === PRIVATE_DIR ? 'private' : 'example'
    const files = await fs.readdir(dir).catch(() => [])
    // A file or folder starting with _ is kept aside (raw exports, cases not to run): it is not a case.
    for (const file of files.filter((f) => f.endsWith('.json') && !f.startsWith('_')).sort()) {
      const data = JSON.parse(await fs.readFile(path.join(dir, file), 'utf8')) as Partial<EvalCase>
      if (!data.job?.description || !data.entities || !data.expected) {
        throw new Error(`${path.join(dir, file)}: needs "job", "entities" and "expected"`)
      }
      cases.push({ ...(data as EvalCase), source, name: data.name ?? file.replace(/\.json$/, '') })
    }
  }
  return cases
}
