/**
 * `--pad n`: buries the library of each case in a bigger one, to see whether a long prompt makes
 * the model miss what it found in a short one (#185). The extra entries come from
 * eval/distractors.json: fictional experiences, projects and skills from many fields (health,
 * teaching, law, trades, writing, some tech). None is ever expected, so a pick among them costs
 * precision and the entries that were expected must still be found.
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import type { EntityMeta } from '@/types'
import type { EvalCase } from './cases'

export interface Distractors {
  experiences: EntityMeta[]
  projects: EntityMeta[]
  skills: EntityMeta[]
}

const FILE = path.resolve(process.cwd(), 'eval', 'distractors.json')

export async function loadDistractors(): Promise<Distractors> {
  const data = JSON.parse(await fs.readFile(FILE, 'utf8')) as Partial<Distractors>
  return { experiences: data.experiences ?? [], projects: data.projects ?? [], skills: data.skills ?? [] }
}

const KINDS = ['experiences', 'projects', 'skills'] as const

/** How many of each kind the pool can give: the most `--pad` can ask for. */
export const poolSize = (pool: Distractors) => Math.min(...KINDS.map((kind) => pool[kind].length))

/**
 * `n` extra entries of each kind (education is not ranked, so it is left alone). Half go before the
 * real entries and half after, so the real ones sit in the middle of the list, where a long prompt
 * is hardest to read: the test is not made easier by their position.
 */
export function padEntities(entities: EvalCase['entities'], pool: Distractors, n: number): EvalCase['entities'] {
  if (n > poolSize(pool)) throw new Error(`--pad ${n}: the pool in eval/distractors.json has ${poolSize(pool)} entries of its smallest kind.`)
  const padded = { ...entities }
  for (const kind of KINDS) {
    const extra = pool[kind].slice(0, n)
    const before = Math.ceil(extra.length / 2)
    padded[kind] = [...extra.slice(0, before), ...entities[kind], ...extra.slice(before)]
  }
  return padded
}
