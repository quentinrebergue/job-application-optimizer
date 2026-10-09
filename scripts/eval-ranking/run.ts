/**
 * Runs every evaluation case through the real ranking (gateway included), measures it
 * and compares it with the saved reference. Options: npm run eval:ranking -- --help
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { rankWithUsage } from '@/lib/ai'
import type { PromptOptions } from '@/lib/ai/formats'
import { helpText, parseArguments, type Args } from './args'
import { loadCases, RESULTS_DIR, type EvalCase } from './cases'
import { formatSizes, measureSizes } from './sizes'
import { overall, scoreRun, summarize, type RunRecord, type Summary } from './metrics'
import { printAnswers, printComparison, printCost, printDetails, printFailures, printHeader, printHints, printMoney, printRequest, printStructure, printTable, type Saved } from './report'

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
        records.push({ ok: true, metrics, ms: Date.now() - start, promptTokens: usage.prompt_tokens, completionTokens: usage.completion_tokens, raw, analysis, promptParts })
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
  ].filter(Boolean).join(', ')
  const label = args.label ?? args.model ?? 'run'

  const all = await loadCases()
  const hasPrivate = all.some((c) => c.source === 'private')
  const cases = all
    .filter((c) => !hasPrivate || c.source === 'private' || args.withExamples)
    .filter((c) => !args.case || c.name.includes(args.case))
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
  const records: Record<string, RunRecord[]> = {}
  const errors = new Set<string>()
  for (const c of cases) {
    records[c.name] = await runCase(c, args.runs, options)
    for (const r of records[c.name]) if (!r.ok) errors.add(r.error)
    summaries[c.name] = summarize(records[c.name])
    if (Object.values(c.expected).every((ids) => ids.length === 0)) {
      console.warn(`  ${c.name}: no expected ids, only time and tokens mean something here.`)
    }
  }
  const total = overall(Object.values(summaries))

  printHeader(label, args.model, cases.length, args.runs, variant)
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
  if (args.saveBaseline) {
    if (total.failures > 0) {
      console.log('Reference NOT saved: some runs failed, a reference must be a clean run.')
    } else {
      await fs.writeFile(baselinePath, JSON.stringify(saved, null, 2))
      console.log(`Reference saved ("${label}") in ${path.basename(baselinePath)}.`)
    }
  }
  if (total.failures > 0) process.exitCode = 1
}

async function start() {
  try {
    const args = parseArguments(process.argv.slice(2))
    if (args.help) console.log(helpText())
    else await main(args)
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

start()
