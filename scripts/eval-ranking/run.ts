/**
 * Runs every evaluation case through the real ranking (gateway included), measures it
 * and compares it with the saved reference. Options: npm run eval:ranking -- --help
 */
import { buildRankingPrompt } from '@/lib/ai/ranking-prompt'
import { startGateway } from './gateway'
import { findLeaks } from './leaks'
import { runPool } from './parallel'
import { mismatchWarning, modelMismatch } from './model-check'
import fs from 'node:fs/promises'
import path from 'node:path'
import { rankWithUsage } from '@/lib/ai'
import type { PromptOptions } from '@/lib/ai/formats'
import { helpText, parseArguments, type Args } from './args'
import { loadCases, RESULTS_DIR, safeHeader, type EvalCase } from './cases'
import { loadDistractors, padEntities } from './pad'
import { formatSizes, measureSizes } from './sizes'
import { overall, scoreRun, summarize, type RunRecord, type Summary } from './metrics'
import { printAnswers, printComparison, printCost, printDetails, printFailures, printHeader, printHints, printMoney, printRequest, printStructure, printTable, type Saved } from './report'

/** The message of an error and of what caused it (a failed connection says why only there). */
function describe(error: unknown): string {
  const parts: string[] = []
  for (let e: unknown = error, depth = 0; e instanceof Error && depth < 4; e = e.cause, depth++) parts.push(e.message)
  return parts.filter((m, i) => m && parts.indexOf(m) === i).join(' <- ')
}

/** The details of the person in the request of a case, as the app would send it (#294); the header is made safe first. */
function leaksIn(c: EvalCase): number {
  if (!c.header) return 0
  const { prompt } = buildRankingPrompt(c.job.title, c.job.company, c.job.description, c.entities, {}, safeHeader(c))
  return findLeaks(c.header, prompt).length
}

/** One ranking of one case: its record, a failure included (the error is kept, nothing is thrown). */
async function runOnce(c: EvalCase, options: PromptOptions, answered: Set<string>): Promise<RunRecord> {
  const start = Date.now()
  try {
    const { analysis, usage, model, diagnostics, raw, promptParts } = await rankWithUsage('eval', c.job.title, c.job.company, c.job.description, c.entities, options, c.header && { title: c.header.title, profile: c.header.profile, fullName: c.header.fullName })
    // The code drops what the AI invented before the answer is returned: count it from the diagnostics.
    const metrics = scoreRun(c.expected, c.entities, analysis)
    metrics.invalidIds += diagnostics.invalidIds
    metrics.emptyTypes = diagnostics.emptyTypes.length
    metrics.droppedProposals = diagnostics.droppedProposals.length
    metrics.leaks = leaksIn(c)
    if (model) answered.add(model)
    return { ok: true, metrics, ms: Date.now() - start, promptTokens: usage.prompt_tokens, completionTokens: usage.completion_tokens, raw, analysis, promptParts }
  } catch (error) {
    return { ok: false, error: describe(error) }
  }
}

/**
 * Every ranking of every case, `parallel` at a time (1: one after the other, as before). The records come back by case,
 * in the order of the runs. When the pool stops because most calls failed, the calls not sent are failures with a reason.
 */
async function runAll(cases: EvalCase[], runs: number, parallel: number, options: PromptOptions, answered: Set<string>): Promise<{ records: Record<string, RunRecord[]>; stopped: boolean }> {
  const jobs = cases.flatMap((c) => Array.from({ length: runs }, () => () => runOnce(c, options, answered)))
  // The client logs every failure with its stack: the summary at the end says it once.
  const logError = console.error
  console.error = () => {}
  try {
    const { results, stopped } = await runPool(jobs, parallel, (r) => !r.ok, (done, total) => process.stdout.write(`  ${done}/${total}\r`))
    const records: Record<string, RunRecord[]> = {}
    cases.forEach((c, i) => {
      records[c.name] = results.slice(i * runs, (i + 1) * runs).map((r) => r ?? { ok: false as const, error: 'not sent: most calls failed, the evaluation was stopped' })
    })
    return { records, stopped }
  } finally {
    console.error = logError
  }
}

/** The reference file: `baseline.json` by default, `baseline-<name>.json` for a named one. */
const baselineFile = (name: string | undefined) => path.join(RESULTS_DIR, name ? `baseline-${name}.json` : 'baseline.json')

async function main(args: Args) {
  if (!args.dryRun && !args.sizes && !process.env.AI_GATEWAY_URL) {
    console.error('AI_GATEWAY_URL is not set: start the gateway (see services/ai-gateway) and put its address in .env.local.')
    process.exit(1)
  }
  const options: PromptOptions = { answerFormat: args.answerFormat, libraryFormat: args.libraryFormat, schema: args.schema, cleanOffer: args.cleanOffer }
  const variant = [
    args.answerFormat !== 'json' && `answer ${args.answerFormat}`,
    args.libraryFormat !== 'text' && `library ${args.libraryFormat}`,
    !args.schema && 'no schema',
    args.cleanOffer && 'offer cleaned',
    args.pad !== undefined && `library padded with ${args.pad} entries of each kind${args.padLength ? `, descriptions of about ${args.padLength} characters` : ''}`,
  ].filter(Boolean).join(', ')
  const label = args.label ?? args.model ?? 'run'

  const all = await loadCases()
  const hasPrivate = all.some((c) => c.source === 'private')
  let cases = all
    .filter((c) => !hasPrivate || c.source === 'private' || args.withExamples)
    .filter((c) => !args.case || c.name.includes(args.case))
  if (args.pad !== undefined) {
    const pool = await loadDistractors()
    cases = cases.map((c) => ({ ...c, entities: padEntities(c.entities, pool, args.pad!, args.padLength) }))
  }
  if (!cases.length) {
    console.error('No case found. Put some in eval/private/ (npm run eval:export -- <job id>) or eval/cases/.')
    process.exit(1)
  }

  if (args.sizes) {
    // Sizes need no gateway and no AI: print them and stop, like --dry-run.
    console.log(formatSizes(measureSizes(cases, options)))
    return
  }

  if (args.dryRun || args.showPrompt) {
    // One case is enough to read a request; --case picks which.
    for (const c of args.case ? cases : cases.slice(0, 1)) printRequest(c, options)
    if (!args.case && cases.length > 1) console.log(`(first case only: ${cases.length} cases found, use --case to choose)`)
  }
  if (args.dryRun) return

  const summaries: Record<string, Summary> = {}
  const errors = new Set<string>()
  const answered = new Set<string>()
  const { records, stopped } = await runAll(cases, args.runs, args.parallel, options, answered)
  for (const c of cases) {
    for (const r of records[c.name]) if (!r.ok) errors.add(r.error)
    summaries[c.name] = summarize(records[c.name])
    if (Object.values(c.expected).every((ids) => ids.length === 0)) {
      console.warn(`  ${c.name}: no expected ids, only time and tokens mean something here.`)
    }
  }
  const total = overall(Object.values(summaries))

  // `--model` only sets the prices: say loudly when another model answered, at the top and at the end.
  const wrongModels = modelMismatch(args.model, answered)
  const warning = wrongModels.length > 0 ? mismatchWarning(args.model!, wrongModels) : ''
  if (warning) console.log(`\n${warning}`)
  printHeader(label, args.model, cases.length, args.runs, variant)
  if (args.parallel > 1) console.log(`${args.parallel} calls at once: the time is measured under load, not comparable with a run one call at a time.\n`)
  if (stopped) console.log('STOPPED: most calls failed (the provider may be limiting the rate): try a lower --parallel. The calls not sent count as failed.\n')
  printTable(summaries, total, args.model)
  const perRanking = printCost(args.model, total)
  printFailures(errors)

  const baselinePath = baselineFile(args.baseline)
  const baseline = await fs.readFile(baselinePath, 'utf8').then((t) => JSON.parse(t) as Saved).catch(() => null)
  printComparison(baseline, summaries, total, perRanking)

  if (args.money) printMoney(args.model, total, records)
  if (args.structure && args.answerFormat === 'json') printStructure(records)
  if (args.details) printDetails(cases, records)
  if (args.showAnswer || args.raw) printAnswers(cases, records, args)
  printHints(args)

  const raw = Object.fromEntries(Object.entries(records).flatMap(([name, list]) => {
    const first = list.find((r): r is Extract<RunRecord, { ok: true }> => r.ok)
    return first ? [[name, first.raw]] : []
  }))
  const saved: Saved = { label, model: args.model, costPerRanking: perRanking, raw, date: new Date().toISOString(), runsPerCase: args.runs, cases: summaries, overall: total }
  await fs.mkdir(RESULTS_DIR, { recursive: true })
  await fs.writeFile(path.join(RESULTS_DIR, `${saved.date.replace(/[:.]/g, '-')}-${label}.json`), JSON.stringify(saved, null, 2))
  if (warning) console.log(`\n${warning}`)
  if (args.saveBaseline) {
    if (warning) {
      console.log('Reference NOT saved: another model answered than the one named in --model.')
    } else if (total.failures > 0) {
      console.log('Reference NOT saved: some runs failed, a reference must be a clean run.')
    } else {
      await fs.writeFile(baselinePath, JSON.stringify(saved, null, 2))
      console.log(`Reference saved ("${label}") in ${path.basename(baselinePath)}.`)
    }
  }
  if (total.failures > 0) process.exitCode = 1
}

/** Runs the evaluation, with a gateway started for it when `--start-gateway` is given (and stopped whatever happens). */
async function withGateway(args: Args) {
  if (!args.startGateway || args.dryRun || args.sizes) return main(args)
  const gateway = await startGateway(args.model)
  const before = process.env.AI_GATEWAY_URL
  process.env.AI_GATEWAY_URL = gateway.url
  try {
    await main(args)
  } finally {
    if (before === undefined) delete process.env.AI_GATEWAY_URL
    else process.env.AI_GATEWAY_URL = before
    await gateway.stop()
  }
}

async function start() {
  try {
    const args = parseArguments(process.argv.slice(2))
    if (args.help) console.log(helpText())
    else await withGateway(args)
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

start()
