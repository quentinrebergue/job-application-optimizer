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

/**
 * The description of an entry made `length` characters long, to test a prompt with long descriptions
 * (the pool's are 120 to 180). It continues with the descriptions of the next entries of the same kind,
 * in a fixed order, and stops at the end of a sentence: the text mixes topics, which does not matter
 * for a size test. An entry already that long is left alone.
 */
export function lengthen(entry: EntityMeta, siblings: EntityMeta[], length: number): EntityMeta {
  const own = (entry as { description?: string }).description
  if (!own || own.length >= length) return entry
  const start = siblings.findIndex((s) => s.id === entry.id)
  let text = own
  for (let i = 1; i < siblings.length && text.length < length; i++) {
    const next = (siblings[(start + i) % siblings.length] as { description?: string }).description
    if (next) text = `${text} ${next}`
  }
  if (text.length > length) {
    const cut = text.lastIndexOf('. ', length)
    text = cut > own.length ? text.slice(0, cut + 1) : text.slice(0, length)
  }
  return { ...entry, description: text } as EntityMeta
}

/** How many of each kind the pool can give: the most `--pad` can ask for. */
export const poolSize = (pool: Distractors) => Math.min(...KINDS.map((kind) => pool[kind].length))

/**
 * `n` extra entries of each kind (education is not ranked, so it is left alone). Half go before the
 * real entries and half after, so the real ones sit in the middle of the list, where a long prompt
 * is hardest to read: the test is not made easier by their position. With `length`, the descriptions
 * of the extra entries are made that long (see `lengthen`).
 */
export function padEntities(entities: EvalCase['entities'], pool: Distractors, n: number, length?: number): EvalCase['entities'] {
  if (n > poolSize(pool)) throw new Error(`--pad ${n}: the pool in eval/distractors.json has ${poolSize(pool)} entries of its smallest kind.`)
  const padded = { ...entities }
  for (const kind of KINDS) {
    const extra = pool[kind].slice(0, n).map((e) => (length ? lengthen(e, pool[kind], length) : e))
    const before = Math.ceil(extra.length / 2)
    padded[kind] = [...extra.slice(0, before), ...entities[kind], ...extra.slice(before)]
  }
  return padded
}
