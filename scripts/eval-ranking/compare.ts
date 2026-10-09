/**
 * Compares two saved references, case by case, without calling the AI:
 *   npm run eval:compare -- <before> <after>
 * Each is the name given to --baseline (json15 -> baseline-json15.json) or a path to a results file.
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { RESULTS_DIR } from './cases'
import { printComparison, type Saved } from './report'

async function load(ref: string): Promise<Saved> {
  const candidates = [ref, path.join(RESULTS_DIR, ref), path.join(RESULTS_DIR, `baseline-${ref}.json`)]
  for (const file of candidates) {
    const text = await fs.readFile(file, 'utf8').catch(() => null)
    if (text) return JSON.parse(text) as Saved
  }
  throw new Error(`No reference "${ref}": looked for ${candidates.join(', ')}`)
}

async function start() {
  const [beforeRef, afterRef] = process.argv.slice(2)
  if (!beforeRef || !afterRef) {
    console.log('Usage: npm run eval:compare -- <before> <after>\n  e.g. npm run eval:compare -- json15 small15')
    return
  }
  const before = await load(beforeRef)
  const after = await load(afterRef)
  const describe = (s: Saved) => `${s.label}${s.model ? ` (${s.model})` : ''}, ${Object.keys(s.cases).length} case(s)`
  console.log(`\nBefore: ${describe(before)}\nAfter:  ${describe(after)}`)
  printComparison(before, after.cases, after.overall, after.costPerRanking ?? null)
  const cost = (s: Saved) => (s.costPerRanking == null ? 'unknown' : `${(s.costPerRanking * 1000).toFixed(2)} EUR per 1000 rankings`)
  console.log(`\nCost: before ${cost(before)}, after ${cost(after)}`)
}

start().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
