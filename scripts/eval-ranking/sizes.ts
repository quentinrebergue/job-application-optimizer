/** How big the request is, in characters: what the gateway limit (MAX_PROMPT_CHARS) counts, part by part. */
import type { PromptOptions } from '@/lib/ai/formats'
import { ANSWER_LAYOUT } from '@/lib/ai/formats'
import { buildRankingPrompt, buildRankingSchema } from '@/lib/ai/ranking-prompt'
import { safeHeader, type EvalCase } from './cases'

export interface SizeRow {
  name: string
  /** System prompt and prompt: the figure the gateway limit is checked against. */
  total: number
  /** The intro and the instructions for the answer: the same for every offer. */
  instructions: number
  /** Experiences, projects and skills. */
  library: number
  offer: number
  /** The JSON schema, sent apart (the gateway caps it on its own); 0 when the answer is not held to one. */
  schema: number
}

/** Characters, as the gateway counts them: an "é" is one, not two. */
const chars = (text: string) => [...text].length

export function measureSizes(cases: EvalCase[], options: PromptOptions = {}): SizeRow[] {
  const format = options.answerFormat ?? 'json'
  return cases.map((c) => {
    const { prompt, labels, parts } = buildRankingPrompt(c.job.title, c.job.company, c.job.description, c.entities, options, safeHeader(c))
    const system = chars(ANSWER_LAYOUT[format].system)
    const held = format === 'json' && options.schema !== false
    return {
      name: c.name,
      total: system + chars(prompt),
      instructions: system + chars(parts.intro) + chars(parts.answer),
      library: chars(parts.experiences) + chars(parts.projects) + chars(parts.skills),
      offer: chars(parts.offer),
      schema: held ? chars(JSON.stringify(buildRankingSchema(labels, !!safeHeader(c)))) : 0,
    }
  })
}

/** The value below which `p` (0 to 1) of the values fall, nearest rank. */
export function percentile(values: number[], p: number): number {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1))]
}

const COLUMNS: { title: string; get: (r: SizeRow) => number }[] = [
  { title: 'total', get: (r) => r.total },
  { title: 'instructions', get: (r) => r.instructions },
  { title: 'library', get: (r) => r.library },
  { title: 'offer', get: (r) => r.offer },
  { title: 'schema', get: (r) => r.schema },
]

/** The table, as text: one line per case, then the spread over all of them. */
export function formatSizes(rows: SizeRow[]): string {
  if (!rows.length) return 'No case.'
  const name = Math.min(44, Math.max(4, ...rows.map((r) => r.name.length)))
  const cell = (value: string | number, width = 14) => String(value).padStart(width)
  const head = `${'case'.padEnd(name)}${COLUMNS.map((c) => cell(c.title)).join('')}`
  const lines = [head, '-'.repeat(head.length)]
  for (const r of [...rows].sort((a, b) => b.total - a.total)) {
    lines.push(`${r.name.slice(0, name).padEnd(name)}${COLUMNS.map((c) => cell(c.get(r))).join('')}`)
  }
  lines.push('-'.repeat(head.length))
  const spread: [string, (values: number[]) => number][] = [
    ['min', (v) => Math.min(...v)],
    ['median', (v) => percentile(v, 0.5)],
    ['p90', (v) => percentile(v, 0.9)],
    ['max', (v) => Math.max(...v)],
  ]
  for (const [label, pick] of spread) {
    lines.push(`${label.padEnd(name)}${COLUMNS.map((c) => cell(pick(rows.map(c.get)))).join('')}`)
  }
  lines.push(
    '',
    'Characters. "total" is system prompt + prompt: what MAX_PROMPT_CHARS of the gateway limits.',
    'The schema is sent apart (its own cap in the gateway) and is not in the total.',
    `${rows.length} cases.`,
  )
  return lines.join('\n')
}
