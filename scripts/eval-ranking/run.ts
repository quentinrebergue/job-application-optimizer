/**
 * Runs every evaluation case through the real ranking (gateway included) and
 * prints how it did, compared with the saved baseline.
 *
 *   npm run eval:ranking -- [--runs 3] [--case text] [--label name] [--with-examples] [--save-baseline]
 *
 * The fictional cases of eval/cases are skipped when eval/private has cases of
 * its own, unless --with-examples is given.
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { rankWithUsage } from '@/lib/ai'
import { loadCases, RESULTS_DIR, type EvalCase } from './cases'
import { compare, overall, scoreRun, summarize, type RunRecord, type Summary } from './metrics'

interface Saved {
  label: string
  date: string
  runsPerCase: number
  cases: Record<string, Summary>
  overall: Summary
}

const BASELINE = path.join(RESULTS_DIR, 'baseline.json')
// Euros per million tokens (Llama 3.3 70B on OVHcloud: 0.67 / 0.67). Override with EVAL_PRICE_IN / EVAL_PRICE_OUT.
const PRICE_IN = Number(process.env.EVAL_PRICE_IN ?? 0.67)
const PRICE_OUT = Number(process.env.EVAL_PRICE_OUT ?? 0.67)

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}

/** The message of an error and of what caused it (a failed connection says why only there). */
function describe(error: unknown): string {
  const parts: string[] = []
  for (let e: unknown = error, depth = 0; e instanceof Error && depth < 4; e = e.cause, depth++) parts.push(e.message)
  return parts.filter((m, i) => m && parts.indexOf(m) === i).join(' <- ')
}

async function runCase(c: EvalCase, runs: number): Promise<RunRecord[]> {
  const records: RunRecord[] = []
  // The client logs every failure with its stack: the summary at the end says it once.
  const logError = console.error
  console.error = () => {}
  try {
    for (let i = 1; i <= runs; i++) {
      const start = Date.now()
      try {
        const { analysis, usage, diagnostics } = await rankWithUsage('eval', c.job.title, c.job.company, c.job.description, c.entities)
        // The code drops what the AI invented before the answer is returned: count it from the diagnostics.
        const metrics = scoreRun(c.expected, c.entities, analysis)
        metrics.invalidIds += diagnostics.invalidIds
        records.push({
          ok: true,
          metrics,
          ms: Date.now() - start,
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
        })
      } catch (error) {
        records.push({ ok: false, error: describe(error) })
      }
      process.stdout.write(`  ${c.name} ${i}/${runs}\r`)
    }
  } finally {
    console.error = logError
  }
  return records
}

const pct = (x: number | null) => (x === null ? '-' : `${Math.round(x * 100)}%`)
const sec = (ms: number) => `${(ms / 1000).toFixed(1)}s`

function row(s: Summary) {
  return {
    recall: pct(s.recall),
    precision: pct(s.precision),
    'not scored': s.expectedNotScored.toFixed(1),
    'bad ids': s.invalidIds.toFixed(1),
    stability: pct(s.stability),
    'time (median)': sec(s.msMedian),
    'time (max)': sec(s.msMax),
    'tokens in/out': `${Math.round(s.promptTokens)}/${Math.round(s.completionTokens)}`,
    failures: s.failures,
  }
}

/** "experiences:exp-1" -> "experiences: Firmware Engineer @ Northwind" */
function nameOf(c: EvalCase, typed: string): string {
  const [type, id] = typed.split(':') as [keyof EvalCase['entities'], string]
  const e = c.entities[type]?.find((x) => x.id === id) as unknown as Record<string, string> | undefined
  if (!e) return `${typed} (not in the library)`
  const name = e.title ?? e.name ?? e.degree ?? id
  return `${type}: ${name}${e.company ? ` @ ${e.company}` : ''}`
}

function printDetails(c: EvalCase, records: RunRecord[]) {
  const first = records.find((r): r is Extract<RunRecord, { ok: true }> => r.ok)
  if (!first) return
  const { missed, extra, invalid } = first.metrics
  if (!missed.length && !extra.length && !invalid.length) return
  console.log(`\n${c.name} (first run)`)
  for (const [label, list] of [['missed', missed], ['added', extra], ['invented', invalid]] as const) {
    for (const typed of list) console.log(`  ${label.padEnd(8)} ${nameOf(c, typed)}`)
  }
}

async function main() {
  if (!process.env.AI_GATEWAY_URL) {
    console.error('AI_GATEWAY_URL is not set: start the gateway (see services/ai-gateway) and put its address in .env.local.')
    process.exit(1)
  }
  const runs = Number(arg('runs') ?? 3)
  const filter = arg('case')
  const label = arg('label') ?? 'run'
  const all = await loadCases()
  const hasPrivate = all.some((c) => c.source === 'private')
  const cases = all
    .filter((c) => !hasPrivate || c.source === 'private' || process.argv.includes('--with-examples'))
    .filter((c) => !filter || c.name.includes(filter))
  if (!cases.length) {
    console.error('No case found. Put some in eval/private/ (npm run eval:export -- <job id>) or eval/cases/.')
    process.exit(1)
  }

  const summaries: Record<string, Summary> = {}
  const records: Record<string, RunRecord[]> = {}
  const errors = new Set<string>()
  for (const c of cases) {
    records[c.name] = await runCase(c, runs)
    for (const r of records[c.name]) if (!r.ok) errors.add(r.error)
    summaries[c.name] = summarize(records[c.name])
    if (Object.values(c.expected).every((ids) => ids.length === 0)) {
      console.warn(`  ${c.name}: no expected ids, only time and tokens mean something here.`)
    }
  }
  const total = overall(Object.values(summaries))

  console.log(`\n${cases.length} case(s) x ${runs} run(s), label "${label}"\n`)
  console.table(Object.fromEntries([...Object.entries(summaries), ['ALL', total]].map(([name, s]) => [name, row(s as Summary)])))
  const cost = ((total.promptTokens * PRICE_IN + total.completionTokens * PRICE_OUT) / 1e6) * (total.runs - total.failures)
  console.log(`Cost of this evaluation: about ${cost.toFixed(3)} EUR`)
  for (const e of errors) console.log(`Failure: ${e}`)
  for (const c of cases) printDetails(c, records[c.name])

  const saved: Saved = { label, date: new Date().toISOString(), runsPerCase: runs, cases: summaries, overall: total }
  const baseline = await fs.readFile(BASELINE, 'utf8').then((t) => JSON.parse(t) as Saved).catch(() => null)
  if (baseline && baseline.overall.failures === 0) {
    console.log(`\nCompared with the baseline "${baseline.label}" (${baseline.date.slice(0, 10)}):`)
    const changes = compare(baseline.overall, total).filter((c) => c.verdict !== 'same')
    if (!changes.length) console.log('  no change beyond the noise')
    for (const c of changes) {
      console.log(`  ${c.verdict === 'better' ? '+' : '-'} ${c.metric}: ${c.before?.toFixed(2)} -> ${c.after?.toFixed(2)} (${c.verdict})`)
    }
  } else {
    console.log('\nNo usable baseline yet: run again with --save-baseline when you are happy with this result.')
  }

  await fs.mkdir(RESULTS_DIR, { recursive: true })
  await fs.writeFile(path.join(RESULTS_DIR, `${saved.date.replace(/[:.]/g, '-')}-${label}.json`), JSON.stringify(saved, null, 2))
  if (process.argv.includes('--save-baseline')) {
    if (total.failures > 0) {
      console.log('Baseline NOT saved: some runs failed, a baseline must be a clean run.')
    } else {
      await fs.writeFile(BASELINE, JSON.stringify(saved, null, 2))
      console.log(`Baseline saved ("${label}").`)
    }
  }
  if (total.failures > 0) process.exitCode = 1
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
