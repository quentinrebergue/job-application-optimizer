import { buildRankingPrompt, buildRankingSchema } from '@/lib/ai/ranking-prompt'
import { ANSWER_LAYOUT, type PromptOptions } from '@/lib/ai/formats'
import type { Args } from './args'
import { safeHeader, type EvalCase } from './cases'
import { findLeaks } from './leaks'
import { compare, type RunRecord, type Summary } from './metrics'
import { averageShares, formatMoney } from './money'
import { costOf, priceOf } from './prices'
import { formatAnswer } from './show'
import { describePaired, paired } from './stats'
import { countSyntax } from './syntax'

/** What a run keeps in eval/results/. */
export interface Saved {
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

type Ok = Extract<RunRecord, { ok: true }>
const firstOk = (list: RunRecord[]) => list.find((r): r is Ok => r.ok)

const pct = (x: number | null) => (x === null ? '-' : `${Math.round(x * 100)}%`)
const sec = (ms: number) => `${(ms / 1000).toFixed(1)}s`
const line = '='.repeat(72)

function problems(s: Summary): string {
  const found = [
    s.failures > 0 ? `${s.failures} failed` : '',
    s.expectedNotScored > 0.05 ? `${s.expectedNotScored.toFixed(1)} not rated` : '',
    s.invalidIds > 0.05 ? `${s.invalidIds.toFixed(1)} invented` : '',
    s.emptyTypes > 0.05 ? `${s.emptyTypes.toFixed(1)} empty` : '',
    s.leaks > 0 ? `LEAK ${s.leaks.toFixed(1)}` : '',
    s.droppedProposals > 0.05 ? `${s.droppedProposals.toFixed(1)} proposal(s) refused` : '',
  ].filter(Boolean)
  return found.length ? found.join(', ') : '-'
}

export function printHeader(label: string, model: string | undefined, cases: number, runs: number, variant: string) {
  console.log(`\n${label}${model && model !== label ? ` (${model})` : ''}: ${cases} case(s) x ${runs} run(s)${variant ? ` [${variant}]` : ''}\n`)
}

export function printTable(summaries: Record<string, Summary>, total: Summary, model: string | undefined) {
  const euros = (s: Summary) => {
    const cost = costOf(model, s.promptTokens, s.completionTokens)
    return cost === null ? '-' : cost.toFixed(4)
  }
  const row = (s: Summary) => ({
    recall: pct(s.recall),
    precision: pct(s.precision),
    stability: pct(s.stability),
    'time (median)': sec(s.msMedian),
    'tokens in/out': `${Math.round(s.promptTokens)}/${Math.round(s.completionTokens)}`,
    'EUR/ranking': euros(s),
    problems: problems(s),
  })
  console.table(Object.fromEntries([...Object.entries(summaries), ['ALL', total]].map(([name, s]) => [name, row(s as Summary)])))
}

export function printCost(model: string | undefined, total: Summary): number | null {
  const perRanking = costOf(model, total.promptTokens, total.completionTokens)
  const price = priceOf(model)
  if (perRanking === null || !price) {
    console.log('No cost: give --model with the name of the model the gateway runs (see prices.ts).')
    return null
  }
  const input = (total.promptTokens * price.input) / 1e6
  const ok = total.runs - total.failures
  console.log(
    `Cost: ${perRanking.toFixed(4)} EUR per ranking (input ${Math.round((input / perRanking) * 100)} %, output ${Math.round((1 - input / perRanking) * 100)} %), ` +
      `${(perRanking * 1000).toFixed(2)} EUR per 1000; this evaluation ${(perRanking * ok).toFixed(3)} EUR (upper bound: cached tokens are not known)`,
  )
  return perRanking
}

export function printFailures(errors: Set<string>) {
  for (const e of errors) console.log(`Failure: ${e}`)
}

/** Against the saved reference: whether the change is real or could be chance, case by case, then the other figures. */
export function printComparison(baseline: Saved | null, summaries: Record<string, Summary>, total: Summary, perRanking: number | null) {
  if (!baseline || baseline.overall.failures > 0) {
    console.log('\nNo usable reference yet: run again with --save-baseline when you are happy with this result.')
    return
  }
  console.log(`\nCompared with "${baseline.label}" (${baseline.date.slice(0, 10)}), case by case:`)
  for (const [metric, title] of [['recall', 'recall   '], ['precision', 'precision']] as const) {
    const names = Object.keys(summaries).filter((n) => baseline.cases[n]?.[metric] != null && summaries[n][metric] != null)
    const before = names.map((n) => baseline.cases[n][metric] as number)
    const after = names.map((n) => summaries[n][metric] as number)
    console.log(`  ${title} ${pct(baseline.overall[metric])} -> ${pct(total[metric])}   ${describePaired(paired(before, after))}`)
  }
  if (baseline.costPerRanking != null && perRanking !== null) {
    const delta = (perRanking - baseline.costPerRanking) / baseline.costPerRanking
    console.log(`  cost      ${baseline.costPerRanking.toFixed(4)} -> ${perRanking.toFixed(4)} EUR per ranking (${delta >= 0 ? '+' : ''}${Math.round(delta * 100)} %)`)
  }
  const others = compare(baseline.overall, total).filter((c) => c.verdict !== 'same' && !['recall', 'precision'].includes(c.metric))
  for (const c of others) console.log(`  ${c.verdict === 'better' ? '+' : '-'} ${c.metric}: ${c.before?.toFixed(2)} -> ${c.after?.toFixed(2)}`)
}

/** "experiences:exp-1" -> "experiences: Firmware Engineer @ Northwind" */
function nameOf(c: EvalCase, typed: string): string {
  const [type, id] = typed.split(':') as [keyof EvalCase['entities'], string]
  const e = c.entities[type]?.find((x) => x.id === id) as unknown as Record<string, string> | undefined
  if (!e) return `${typed} (not in the library)`
  const name = e.title ?? e.name ?? e.degree ?? id
  return `${type}: ${name}${e.company ? ` @ ${e.company}` : ''}`
}

export function printDetails(cases: EvalCase[], records: Record<string, RunRecord[]>) {
  for (const c of cases) {
    const first = firstOk(records[c.name])
    if (!first) continue
    const { missed, extra, invalid } = first.metrics
    if (!missed.length && !extra.length && !invalid.length) continue
    console.log(`\n${c.name} (first run)`)
    for (const [label, list] of [['missed', missed], ['added', extra], ['invented', invalid]] as const) {
      for (const typed of list) console.log(`  ${label.padEnd(8)} ${nameOf(c, typed)}`)
    }
  }
}

/** The cost split between the prompt and the answer, and between their parts, to see where to optimise. */
export function printMoney(model: string | undefined, total: Summary, records: Record<string, RunRecord[]>) {
  const firsts = Object.values(records).map(firstOk).filter((r): r is Ok => !!r)
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

/** How much of the AI's first answer is only JSON structure ({ } [ ] : , and quotes), in total and in each part. */
export function printStructure(records: Record<string, RunRecord[]>) {
  const parts = new Map<string, { total: number; syntax: number }>()
  const grand = { total: 0, syntax: 0 }
  let answers = 0
  for (const list of Object.values(records)) {
    const first = firstOk(list)
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
  console.log(`\nJSON structure { } [ ] : , " : ${Math.round(grand.syntax / answers)} of ${Math.round(grand.total / answers)} characters per answer, ${share(grand)} (${[...parts].map(([key, c]) => `${key} ${share(c)}`).join(', ')})`)
}

/** The answers of the first case (or of the cases picked with --case). */
export function printAnswers(cases: EvalCase[], records: Record<string, RunRecord[]>, args: Args) {
  for (const c of args.case ? cases : cases.slice(0, 1)) {
    const first = firstOk(records[c.name])
    if (!first) continue
    if (args.showAnswer && first.analysis) {
      console.log(`\n${line}\nANSWER for "${c.name}" (first run)\n${line}\n${formatAnswer(first.analysis, c.expected)}`)
    }
    if (args.raw) {
      console.log(`\n${line}\nRAW ANSWER of the AI for "${c.name}" (first run, as it came, ${first.completionTokens} tokens)\n${line}\n${JSON.stringify(first.raw, null, 2)}`)
    }
  }
}

/** The request the app sends for this case: the system prompt, the prompt and the JSON schema of the answer. */
export function printRequest(c: EvalCase, options: PromptOptions) {
  const header = safeHeader(c)
  const { prompt, labels } = buildRankingPrompt(c.job.title, c.job.company, c.job.description, c.entities, options, header)
  const leaks = findLeaks(c.header, prompt)
  const json = (options.answerFormat ?? 'json') === 'json' && options.schema !== false
  const schema = json ? JSON.stringify(buildRankingSchema(labels, !!header), null, 2) : '(none: the answer is not held to a schema, the code validates it)'
  console.log(`\n${line}\nREQUEST for "${c.name}"\n${line}`)
  if (leaks.length > 0) console.log(`\nLEAK: the request holds ${leaks.join(', ')} of the person`)
  if (options.cleanOffer) {
    const cleaned = buildRankingPrompt(c.job.title, c.job.company, c.job.description, c.entities, options).parts.offer.length
    const original = buildRankingPrompt(c.job.title, c.job.company, c.job.description, c.entities, { ...options, cleanOffer: undefined }).parts.offer.length
    console.log(`\nOffer cleaned: ${original} -> ${cleaned} characters (${Math.round((1 - cleaned / original) * 100)}% removed)`)
  }
  console.log(`\n--- system ---\n${ANSWER_LAYOUT[options.answerFormat ?? 'json'].system}`)
  console.log(`\n--- prompt (${prompt.length} characters, about ${Math.round(prompt.length / 4)} tokens) ---\n${prompt}`)
  console.log(`\n--- schema of the answer (${schema.length} characters) ---\n${schema}\n${line}\n`)
}

export function printHints(args: Args) {
  const more = [!args.details && '--details', !args.money && '--money', !args.structure && '--structure', '--show-answer', '--raw'].filter(Boolean)
  console.log(`\nMore: ${more.join(' ')}. All the options: --help`)
}
