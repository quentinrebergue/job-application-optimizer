/**
 * Runs every evaluation case through the real ranking (gateway included) and
 * prints how it did, compared with the saved baseline.
 *
 *   npm run eval:ranking -- [--model name] [--runs 3] [--case text] [--label name] [--baseline name] [--with-examples] [--save-baseline]
 *   npm run eval:ranking -- --answer-format yaml|yaml-compact --library-format yaml   # try other formats (default: json, text)
 *   npm run eval:ranking -- --no-schema                   # JSON answer not held to a schema (an experiment)
 *   npm run eval:ranking -- --show-prompt [--case text]   # print the request, then run
 *   npm run eval:ranking -- --dry-run [--case text]       # print the request and stop: no call, no cost
 *   npm run eval:ranking -- --raw [--case text]           # print the AI's answer exactly as it came (JSON)
 *   npm run eval:ranking -- --show-answer [--case text]   # print it as the app understood it: levels, reasons, expectations
 *   (--raw and --show-answer can be combined)
 *
 * --model is the model the gateway runs (it sets the prices); --baseline names the
 * reference to compare with and to save (one per way of ranking, e.g. small, medium).
 *
 * The fictional cases of eval/cases are skipped when eval/private has cases of
 * its own, unless --with-examples is given.
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { rankWithUsage } from '@/lib/ai'
import { buildRankingPrompt, buildRankingSchema } from '@/lib/ai/ranking-prompt'
import { ANSWER_FORMATS, ANSWER_LAYOUT, LIBRARY_FORMATS, type AnswerFormat, type LibraryFormat, type PromptOptions } from '@/lib/ai/formats'
import { loadCases, RESULTS_DIR, type EvalCase } from './cases'
import { compare, overall, scoreRun, summarize, type RunRecord, type Summary } from './metrics'
import { costOf, priceOf } from './prices'
import { averageShares, formatMoney } from './money'
import { formatAnswer } from './show'
import { countSyntax } from './syntax'

interface Saved {
  /** The AI's first answer for each case, as it came: lets the selection rules be replayed without calling it again. */
  raw?: Record<string, unknown>
  label: string
  model?: string
  /** Euros for one ranking (an upper bound: cached tokens are not known). */
  costPerRanking?: number | null
  date: string
  runsPerCase: number
  cases: Record<string, Summary>
  overall: Summary
}

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

async function runCase(c: EvalCase, runs: number, options: PromptOptions): Promise<RunRecord[]> {
  const records: RunRecord[] = []
  // The client logs every failure with its stack: the summary at the end says it once.
  const logError = console.error
  console.error = () => {}
  try {
    for (let i = 1; i <= runs; i++) {
      const start = Date.now()
      try {
        const { analysis, usage, diagnostics, raw, promptParts } = await rankWithUsage('eval', c.job.title, c.job.company, c.job.description, c.entities, options)
        // The code drops what the AI invented before the answer is returned: count it from the diagnostics.
        const metrics = scoreRun(c.expected, c.entities, analysis)
        metrics.invalidIds += diagnostics.invalidIds
        records.push({
          ok: true,
          metrics,
          ms: Date.now() - start,
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          raw,
          analysis,
          promptParts,
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

/** The reference file: `baseline.json` by default, `baseline-<name>.json` for a named one. */
const baselineFile = (name: string | undefined) => path.join(RESULTS_DIR, name ? `baseline-${name}.json` : 'baseline.json')

/** How much of the AI's first answer is only JSON structure ({ } [ ] : , and quotes), in total and in each part. */
function printJsonStructure(records: Record<string, RunRecord[]>) {
  const parts = new Map<string, { total: number; syntax: number }>()
  const grand = { total: 0, syntax: 0 }
  let answers = 0
  for (const list of Object.values(records)) {
    const first = list.find((r): r is Extract<RunRecord, { ok: true }> => r.ok)
    if (!first || typeof first.raw !== 'object' || first.raw === null) continue
    answers++
    for (const [key, value] of Object.entries(first.raw)) {
      const c = countSyntax(value)
      const sum = parts.get(key) ?? { total: 0, syntax: 0 }
      parts.set(key, { total: sum.total + c.total, syntax: sum.syntax + c.syntax })
      grand.total += c.total
      grand.syntax += c.syntax
    }
  }
  if (!answers) return
  const share = (c: { total: number; syntax: number }) => `${Math.round((c.syntax / Math.max(1, c.total)) * 100)}%`
  console.log(`JSON structure { } [ ] : , " : ${Math.round(grand.syntax / answers)} of ${Math.round(grand.total / answers)} characters per answer, ${share(grand)} (${[...parts].map(([key, c]) => `${key} ${share(c)}`).join(', ')})`)
}

/** The cost split between the prompt and the answer, and between their parts, to see where to optimise. */
function printMoney(model: string | undefined, total: Summary, records: Record<string, RunRecord[]>) {
  const firsts = Object.values(records)
    .map((list) => list.find((r): r is Extract<RunRecord, { ok: true }> => r.ok))
    .filter((r): r is Extract<RunRecord, { ok: true }> => !!r)
  const sizes = (raw: unknown) =>
    typeof raw === 'object' && raw !== null ? Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, JSON.stringify(value).length])) : {}
  console.log('\n' + formatMoney({
    model,
    price: priceOf(model),
    promptTokens: total.promptTokens,
    completionTokens: total.completionTokens,
    inputShares: averageShares(firsts.map((r) => r.promptParts ?? {})),
    outputShares: averageShares(firsts.map((r) => sizes(r.raw))),
  }))
}

const hasFlag = (name: string) => process.argv.includes(`--${name}`)

/** The request the app sends for this case: the system prompt, the prompt and the JSON schema of the answer. */
function printRequest(c: EvalCase, options: PromptOptions) {
  const { prompt, labels } = buildRankingPrompt(c.job.title, c.job.company, c.job.description, c.entities, options)
  const json = (options.answerFormat ?? 'json') === 'json' && options.schema !== false
  const schema = json ? JSON.stringify(buildRankingSchema(labels), null, 2) : '(none: the answer is not held to a schema, the code validates it)'
  const line = '='.repeat(72)
  console.log(`\n${line}\nREQUEST for "${c.name}"\n${line}`)
  console.log(`\n--- system ---\n${ANSWER_LAYOUT[options.answerFormat ?? 'json'].system}`)
  console.log(`\n--- prompt (${prompt.length} characters, about ${Math.round(prompt.length / 4)} tokens) ---\n${prompt}`)
  console.log(`\n--- schema of the answer (${schema.length} characters) ---\n${schema}\n${line}\n`)
}

async function main() {
  const dryRun = hasFlag('dry-run')
  if (!dryRun && !process.env.AI_GATEWAY_URL) {
    console.error('AI_GATEWAY_URL is not set: start the gateway (see services/ai-gateway) and put its address in .env.local.')
    process.exit(1)
  }
  const runs = Number(arg('runs') ?? 3)
  const filter = arg('case')
  const model = arg('model')
  const answerFormat = (arg('answer-format') ?? 'json') as AnswerFormat
  const libraryFormat = (arg('library-format') ?? 'text') as LibraryFormat
  if (!ANSWER_FORMATS.includes(answerFormat) || !LIBRARY_FORMATS.includes(libraryFormat)) {
    console.error(`--answer-format is one of ${ANSWER_FORMATS.join(', ')}; --library-format one of ${LIBRARY_FORMATS.join(', ')}.`)
    process.exit(1)
  }
  const options: PromptOptions = { answerFormat, libraryFormat, schema: !hasFlag('no-schema') }
  const formats = answerFormat === 'json' && libraryFormat === 'text' && options.schema ? '' : ` [answer ${answerFormat}${options.schema ? '' : ', no schema'}, library ${libraryFormat}]`
  const label = arg('label') ?? model ?? 'run'
  const baselinePath = baselineFile(arg('baseline'))
  const all = await loadCases()
  const hasPrivate = all.some((c) => c.source === 'private')
  const cases = all
    .filter((c) => !hasPrivate || c.source === 'private' || process.argv.includes('--with-examples'))
    .filter((c) => !filter || c.name.includes(filter))
  if (!cases.length) {
    console.error('No case found. Put some in eval/private/ (npm run eval:export -- <job id>) or eval/cases/.')
    process.exit(1)
  }

  if (dryRun || hasFlag('show-prompt')) {
    // One case is enough to read a request; --case picks which.
    const shown = filter ? cases : cases.slice(0, 1)
    for (const c of shown) printRequest(c, options)
    if (!filter && cases.length > 1) console.log(`(first case only: ${cases.length} cases found, use --case to choose)`)
  }
  if (dryRun) return

  const summaries: Record<string, Summary> = {}
  const records: Record<string, RunRecord[]> = {}
  const errors = new Set<string>()
  for (const c of cases) {
    records[c.name] = await runCase(c, runs, options)
    for (const r of records[c.name]) if (!r.ok) errors.add(r.error)
    summaries[c.name] = summarize(records[c.name])
    if (Object.values(c.expected).every((ids) => ids.length === 0)) {
      console.warn(`  ${c.name}: no expected ids, only time and tokens mean something here.`)
    }
  }
  const total = overall(Object.values(summaries))

  console.log(`\n${cases.length} case(s) x ${runs} run(s), label "${label}"${formats}\n`)
  console.table(Object.fromEntries([...Object.entries(summaries), ['ALL', total]].map(([name, s]) => [name, row(s as Summary)])))
  const perRanking = costOf(model, total.promptTokens, total.completionTokens)
  if (perRanking === null) {
    console.log('No cost: give --model with the name of the model the gateway runs (see prices.ts).')
  } else {
    const ok = total.runs - total.failures
    console.log(`Cost: about ${perRanking.toFixed(4)} EUR per ranking, ${(perRanking * 1000).toFixed(2)} EUR per 1000, ${(perRanking * ok).toFixed(3)} EUR for this evaluation (upper bound)`)
  }
  for (const e of errors) console.log(`Failure: ${e}`)
  printMoney(model, total, records)
  if (answerFormat === 'json') printJsonStructure(records)
  if (hasFlag('show-answer') || hasFlag('raw')) {
    for (const c of filter ? cases : cases.slice(0, 1)) {
      const first = records[c.name].find((r): r is Extract<RunRecord, { ok: true }> => r.ok)
      if (!first) continue
      const line = '='.repeat(72)
      if (hasFlag('show-answer') && first.analysis) {
        console.log(`\n${line}\nANSWER for "${c.name}" (first run)\n${line}\n${formatAnswer(first.analysis, c.expected)}`)
      }
      if (hasFlag('raw')) {
        console.log(`\n${line}\nRAW ANSWER of the AI for "${c.name}" (first run, as it came, ${first.completionTokens} tokens)\n${line}\n${JSON.stringify(first.raw, null, 2)}`)
      }
    }
  }
  for (const c of cases) printDetails(c, records[c.name])

  const raw = Object.fromEntries(Object.entries(records).flatMap(([name, list]) => {
    const first = list.find((r): r is Extract<RunRecord, { ok: true }> => r.ok)
    return first ? [[name, first.raw]] : []
  }))
  const saved: Saved = { label, model, costPerRanking: perRanking, raw, date: new Date().toISOString(), runsPerCase: runs, cases: summaries, overall: total }
  const baseline = await fs.readFile(baselinePath, 'utf8').then((t) => JSON.parse(t) as Saved).catch(() => null)
  if (baseline && baseline.overall.failures === 0) {
    console.log(`\nCompared with the baseline "${baseline.label}" (${baseline.date.slice(0, 10)}):`)
    const changes = compare(baseline.overall, total).filter((c) => c.verdict !== 'same')
    if (baseline.costPerRanking != null && perRanking !== null) {
      const delta = (perRanking - baseline.costPerRanking) / baseline.costPerRanking
      console.log(`  cost per ranking: ${baseline.costPerRanking.toFixed(4)} -> ${perRanking.toFixed(4)} EUR (${delta >= 0 ? '+' : ''}${Math.round(delta * 100)} %)`)
    }
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
      await fs.writeFile(baselinePath, JSON.stringify(saved, null, 2))
      console.log(`Baseline saved ("${label}") in ${path.basename(baselinePath)}.`)
    }
  }
  if (total.failures > 0) process.exitCode = 1
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
