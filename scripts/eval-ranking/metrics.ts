import type { AIAnalysisResult } from '@/types/job'

/** What the evaluation of the AI ranking measures; pure functions, no AI call. */

export type SelectedType = 'experiences' | 'projects' | 'skills'
export const SELECTED_TYPES: SelectedType[] = ['experiences', 'projects', 'skills']

export type Expected = Record<SelectedType, string[]>
export type Library = Record<SelectedType | 'education', { id: string }[]>

const RECOMMENDED: Record<SelectedType, (a: AIAnalysisResult) => string[]> = {
  experiences: (a) => a.recommended_experience_ids,
  projects: (a) => a.recommended_project_ids,
  skills: (a) => a.recommended_skill_ids,
}

export interface RunMetrics {
  hits: number
  expected: number
  recommended: number
  /** hits / expected: did the AI pick what I would have picked? null when nothing is expected. */
  recall: number | null
  /** hits / recommended: did it pick things I would not have? null when it picked nothing. */
  precision: number | null
  /** Recommended ids that are not in the library (invented). */
  invalidIds: number
  /** Expected ids the AI did not even mention in its scores (forgotten, not judged low). */
  expectedNotScored: number
  /** Everything it recommended, as "type:id", for the stability measure. */
  selection: string[]
  /** Expected and not recommended, as "type:id": what the AI missed. */
  missed: string[]
  /** Recommended and not expected, as "type:id". */
  extra: string[]
  /** Recommended ids that are not in the library of that type, as "type:id". */
  invalid: string[]
}

export function scoreRun(expected: Expected, library: Library, analysis: AIAnalysisResult): RunMetrics {
  let hits = 0, expectedTotal = 0, recommendedTotal = 0, expectedNotScored = 0
  const selection: string[] = [], missed: string[] = [], extra: string[] = [], invalid: string[] = []
  for (const type of SELECTED_TYPES) {
    const wanted = new Set(expected[type] ?? [])
    const picked = new Set(RECOMMENDED[type](analysis) ?? [])
    const known = new Set(library[type].map((e) => e.id))
    const scored = new Set((analysis.entities_by_type?.[type] ?? []).map((e) => e.id))
    for (const id of picked) {
      if (wanted.has(id)) hits++
      else extra.push(`${type}:${id}`)
      if (!known.has(id)) invalid.push(`${type}:${id}`)
      selection.push(`${type}:${id}`)
    }
    for (const id of wanted) {
      if (!picked.has(id)) missed.push(`${type}:${id}`)
      if (!scored.has(id)) expectedNotScored++
    }
    expectedTotal += wanted.size
    recommendedTotal += picked.size
  }
  return {
    hits,
    expected: expectedTotal,
    recommended: recommendedTotal,
    recall: expectedTotal ? hits / expectedTotal : null,
    precision: recommendedTotal ? hits / recommendedTotal : null,
    invalidIds: invalid.length,
    expectedNotScored,
    selection: selection.sort(),
    missed,
    extra,
    invalid,
  }
}

/** Mean overlap (Jaccard) between the selections of several runs of the same case: 1 = identical every time. */
export function stability(selections: string[][]): number | null {
  if (selections.length < 2) return null
  let total = 0, pairs = 0
  for (let i = 0; i < selections.length; i++) {
    for (let j = i + 1; j < selections.length; j++) {
      const a = new Set(selections[i]), b = new Set(selections[j])
      const union = new Set([...a, ...b]).size
      const inter = [...a].filter((x) => b.has(x)).length
      total += union ? inter / union : 1
      pairs++
    }
  }
  return total / pairs
}

export type RunRecord =
  | { ok: true; metrics: RunMetrics; ms: number; promptTokens: number; completionTokens: number }
  | { ok: false; error: string }

export interface Summary {
  runs: number
  failures: number
  recall: number | null
  precision: number | null
  invalidIds: number
  expectedNotScored: number
  stability: number | null
  msMedian: number
  msMax: number
  promptTokens: number
  completionTokens: number
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)
const meanOrNull = (xs: (number | null)[]) => {
  const present = xs.filter((x): x is number => x !== null)
  return present.length ? mean(present) : null
}
const median = (xs: number[]) => {
  if (!xs.length) return 0
  const sorted = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export function summarize(records: RunRecord[]): Summary {
  const ok = records.filter((r): r is Extract<RunRecord, { ok: true }> => r.ok)
  return {
    runs: records.length,
    failures: records.length - ok.length,
    recall: meanOrNull(ok.map((r) => r.metrics.recall)),
    precision: meanOrNull(ok.map((r) => r.metrics.precision)),
    invalidIds: mean(ok.map((r) => r.metrics.invalidIds)),
    expectedNotScored: mean(ok.map((r) => r.metrics.expectedNotScored)),
    stability: stability(ok.map((r) => r.metrics.selection)),
    msMedian: median(ok.map((r) => r.ms)),
    msMax: Math.max(0, ...ok.map((r) => r.ms)),
    promptTokens: mean(ok.map((r) => r.promptTokens)),
    completionTokens: mean(ok.map((r) => r.completionTokens)),
  }
}

/** All cases together: the mean of each case's figure (every offer weighs the same). */
export function overall(summaries: Summary[]): Summary {
  return {
    runs: summaries.reduce((n, s) => n + s.runs, 0),
    failures: summaries.reduce((n, s) => n + s.failures, 0),
    recall: meanOrNull(summaries.map((s) => s.recall)),
    precision: meanOrNull(summaries.map((s) => s.precision)),
    invalidIds: mean(summaries.map((s) => s.invalidIds)),
    expectedNotScored: mean(summaries.map((s) => s.expectedNotScored)),
    stability: meanOrNull(summaries.map((s) => s.stability)),
    msMedian: median(summaries.map((s) => s.msMedian)),
    msMax: Math.max(0, ...summaries.map((s) => s.msMax)),
    promptTokens: mean(summaries.map((s) => s.promptTokens)),
    completionTokens: mean(summaries.map((s) => s.completionTokens)),
  }
}

type Metric = keyof Omit<Summary, 'runs'>
// Which way is better, and how much of a change counts (ratios: 0.01 points; time and tokens: 10 %).
const RULES: Record<Metric, { better: 'higher' | 'lower'; tolerance: number; relative: boolean }> = {
  recall: { better: 'higher', tolerance: 0.01, relative: false },
  precision: { better: 'higher', tolerance: 0.01, relative: false },
  stability: { better: 'higher', tolerance: 0.01, relative: false },
  failures: { better: 'lower', tolerance: 0, relative: false },
  invalidIds: { better: 'lower', tolerance: 0, relative: false },
  expectedNotScored: { better: 'lower', tolerance: 0, relative: false },
  msMedian: { better: 'lower', tolerance: 0.1, relative: true },
  msMax: { better: 'lower', tolerance: 0.1, relative: true },
  promptTokens: { better: 'lower', tolerance: 0.1, relative: true },
  completionTokens: { better: 'lower', tolerance: 0.1, relative: true },
}

export interface Change {
  metric: Metric
  before: number | null
  after: number | null
  verdict: 'better' | 'worse' | 'same'
}

export function compare(before: Summary, after: Summary): Change[] {
  return (Object.keys(RULES) as Metric[]).map((metric) => {
    const a = before[metric], b = after[metric]
    const rule = RULES[metric]
    if (a === null || b === null) return { metric, before: a, after: b, verdict: 'same' as const }
    const delta = b - a
    const threshold = rule.relative ? Math.abs(a) * rule.tolerance : rule.tolerance
    if (Math.abs(delta) <= threshold) return { metric, before: a, after: b, verdict: 'same' as const }
    const improved = rule.better === 'higher' ? delta > 0 : delta < 0
    return { metric, before: a, after: b, verdict: improved ? ('better' as const) : ('worse' as const) }
  })
}
