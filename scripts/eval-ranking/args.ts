import { parseArgs } from 'node:util'
import { ANSWER_FORMATS, LIBRARY_FORMATS, type AnswerFormat, type LibraryFormat } from '@/lib/ai/formats'

/** Every option of the evaluation, once: it feeds the parsing and the --help. */
interface Flag {
  name: string
  type: 'boolean' | 'string'
  /** The name of the value in the help (string options). */
  value?: string
  group: string
  description: string
}

const GROUPS = ['Run', 'Compare', 'Print', 'Try a variant'] as const

export const FLAGS: Flag[] = [
  { name: 'model', type: 'string', value: 'name', group: 'Run', description: 'The model the gateway runs (e.g. mistral-medium-2604). It sets the prices; without it there is no cost. See prices.ts.' },
  { name: 'runs', type: 'string', value: 'n', group: 'Run', description: 'Runs per case (default 3). The answers are nearly the same from one run to the next, so more runs add little: more cases do.' },
  { name: 'case', type: 'string', value: 'text', group: 'Run', description: 'Only the cases whose name contains this text. Also picks which case --dry-run, --show-prompt, --raw and --show-answer print.' },
  { name: 'with-examples', type: 'boolean', group: 'Run', description: 'Also run the fictional cases of eval/cases (skipped when eval/private has cases).' },
  { name: 'label', type: 'string', value: 'name', group: 'Compare', description: 'A name for this run, written in its results file (default: the model).' },
  { name: 'baseline', type: 'string', value: 'name', group: 'Compare', description: 'The reference to compare with and to save: one per way of ranking (default: the unnamed one). Files are in eval/results/.' },
  { name: 'save-baseline', type: 'boolean', group: 'Compare', description: 'Keep this run as the reference. Refused when a run failed.' },
  { name: 'details', type: 'boolean', group: 'Print', description: 'For each case, what the AI missed, added and invented (first run).' },
  { name: 'money', type: 'boolean', group: 'Print', description: 'Where the money goes: input and output, by part of the prompt and of the answer.' },
  { name: 'structure', type: 'boolean', group: 'Print', description: 'How much of the JSON answer is only structure ({ } [ ] : , and quotes).' },
  { name: 'show-prompt', type: 'boolean', group: 'Print', description: 'The request: system prompt, prompt and schema of the answer; then the evaluation runs.' },
  { name: 'sizes', type: 'boolean', group: 'Print', description: 'How big the request is for every case (system prompt + prompt, what the gateway limit counts), part by part, with the min, median, p90 and max. No call to the AI.' },
  { name: 'dry-run', type: 'boolean', group: 'Print', description: 'The request, then stop: no call to the AI, no cost, no gateway needed.' },
  { name: 'show-answer', type: 'boolean', group: 'Print', description: 'The answer as the app understood it: every entry with its level, what is recommended, what you expected.' },
  { name: 'raw', type: 'boolean', group: 'Print', description: 'The answer of the AI exactly as it came.' },
  { name: 'answer-format', type: 'string', value: 'json|yaml|yaml-compact', group: 'Try a variant', description: `How the AI writes its answer (default json). YAML cannot be held to a schema: the code validates it.` },
  { name: 'library-format', type: 'string', value: 'text|yaml', group: 'Try a variant', description: 'How the library is written in the prompt (default text).' },
  { name: 'no-schema', type: 'boolean', group: 'Try a variant', description: 'JSON answer not held to a JSON schema (the code still validates it).' },
  { name: 'clean-offer', type: 'string', value: 'code', group: 'Try a variant', description: 'Clean the offer before it is sent: drops benefits, "about us", equal-opportunity text and links (plain rules, see src/lib/ai/offer.ts).' },
]

export interface Args {
  help: boolean
  model?: string
  runs: number
  case?: string
  withExamples: boolean
  label?: string
  baseline?: string
  saveBaseline: boolean
  details: boolean
  money: boolean
  structure: boolean
  showPrompt: boolean
  sizes: boolean
  dryRun: boolean
  showAnswer: boolean
  raw: boolean
  answerFormat: AnswerFormat
  libraryFormat: LibraryFormat
  schema: boolean
  cleanOffer?: 'code'
}

export function parseArguments(argv: string[]): Args {
  const options = Object.fromEntries([
    ['help', { type: 'boolean' as const }],
    ...FLAGS.map((f) => [f.name, { type: f.type }] as const),
  ])
  let values: Record<string, string | boolean | undefined>
  try {
    values = parseArgs({ args: argv, options, strict: true, allowPositionals: false }).values
  } catch (error) {
    throw new Error(`${error instanceof Error ? error.message.split('. ')[0] : error}. Run with --help to see the options.`)
  }

  const answerFormat = (values['answer-format'] ?? 'json') as AnswerFormat
  const libraryFormat = (values['library-format'] ?? 'text') as LibraryFormat
  if (!ANSWER_FORMATS.includes(answerFormat)) throw new Error(`--answer-format is one of ${ANSWER_FORMATS.join(', ')}.`)
  if (!LIBRARY_FORMATS.includes(libraryFormat)) throw new Error(`--library-format is one of ${LIBRARY_FORMATS.join(', ')}.`)
  const cleanOffer = values['clean-offer'] as string | undefined
  if (cleanOffer !== undefined && cleanOffer !== 'code') throw new Error('--clean-offer is code.')
  const runs = Number(values.runs ?? 3)
  if (!Number.isInteger(runs) || runs < 1) throw new Error('--runs is a whole number of at least 1.')

  return {
    help: Boolean(values.help),
    model: values.model as string | undefined,
    runs,
    case: values.case as string | undefined,
    withExamples: Boolean(values['with-examples']),
    label: values.label as string | undefined,
    baseline: values.baseline as string | undefined,
    saveBaseline: Boolean(values['save-baseline']),
    details: Boolean(values.details),
    money: Boolean(values.money),
    structure: Boolean(values.structure),
    showPrompt: Boolean(values['show-prompt']),
    sizes: Boolean(values.sizes),
    dryRun: Boolean(values['dry-run']),
    showAnswer: Boolean(values['show-answer']),
    raw: Boolean(values.raw),
    answerFormat,
    libraryFormat,
    schema: !values['no-schema'],
    cleanOffer: cleanOffer as 'code' | undefined,
  }
}

export function helpText(): string {
  const lines = [
    'Usage: npm run eval:ranking -- [options]',
    '',
    'Runs every case (eval/private, or eval/cases) through the real ranking, gateway included,',
    'measures it and compares it with a saved reference. Nothing here changes the app.',
    '',
    'It calls the AI (and needs AI_GATEWAY_URL) unless you pass --sizes or --dry-run: those two',
    'only print and stop, with no gateway and no cost.',
  ]
  for (const group of GROUPS) {
    lines.push('', `${group}:`)
    for (const f of FLAGS.filter((flag) => flag.group === group)) {
      const usage = f.type === 'string' ? `--${f.name} <${f.value}>` : `--${f.name}`
      lines.push(`  ${usage.padEnd(44)} ${f.description}`)
    }
  }
  lines.push(
    '',
    'Examples:',
    '  npm run eval:ranking -- --model mistral-medium-2604 --baseline medium',
    '  npm run eval:ranking -- --model mistral-medium-2604 --baseline medium --save-baseline',
    '  npm run eval:ranking -- --dry-run --case helsing --clean-offer code',
    '  npm run eval:ranking -- --sizes',
    '  npm run eval:ranking -- --model mistral-medium-2604 --answer-format yaml --label yaml --details --money',
    '',
    'Other commands: npm run eval:export -- <job id>   turns one of your jobs into a case in eval/private/',
    '',
  )
  return lines.join('\n')
}
