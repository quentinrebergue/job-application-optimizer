/**
 * The functional test of the resume import: real PDFs through the real chain (pdf-text service, AI gateway,
 * the checks of the app), run several times, with what each run gave against what is expected. Nothing is
 * saved: the checks and the save are tested elsewhere; this answers "does it read my resumes right?".
 * Options: npm run eval:import -- --help
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { readPdfText } from '@/lib/pdf/text-client'
import { askGateway } from '@/lib/ai/gateway'
import { costOf } from '@/lib/ai/prices'
import { IMPORT_SCHEMA, IMPORT_SYSTEM_PROMPT, buildImportPrompt, parseImportAnswer } from '@/lib/ai/import-prompt'
import { KINDS, problems, type Counts, type Expected } from './check'

interface ImportCase {
  name: string
  source: 'example' | 'private'
  /** The PDF: a path from the root of the repository, or an absolute one. */
  pdf: string
  expected: Expected
}

const ROOT = process.cwd()
// `import` is versioned (fictional resumes of the repository); `private/import` is not (my real resumes).
const DIRS = [
  { dir: path.join(ROOT, 'eval', 'import'), source: 'example' as const },
  { dir: path.join(ROOT, 'eval', 'private', 'import'), source: 'private' as const },
]

const HELP = `npm run eval:import -- [options]

Needs PDF_TEXT_URL (the pdf-text service) and AI_GATEWAY_URL (a gateway with the "import" feature) in .env.local.
Cases: eval/import/*.json (fictional) and eval/private/import/*.json (yours, not versioned):
  { "pdf": "path/to/resume.pdf", "expected": { "experiences": 1, "education": 2, "projects": { "max": 3 }, "skills": { "min": 3 } } }

  --runs n        Runs per case (default 3): the same resume does not always give the same answer.
  --case text     Only the cases whose name contains this text.
  --show          Print what each run gave: entries with their fields (personal data on your screen).
  --dry-run       The text as the model reads it (numbered lines) and the request; no call to the AI.
  --model name    The model the gateway runs: it sets the cost (see src/lib/ai/prices.ts).
  --help          This text.`

async function loadCases(): Promise<ImportCase[]> {
  const cases: ImportCase[] = []
  for (const { dir, source } of DIRS) {
    const files = await fs.readdir(dir).catch(() => [])
    for (const file of files.filter((f) => f.endsWith('.json') && !f.startsWith('_')).sort()) {
      const data = JSON.parse(await fs.readFile(path.join(dir, file), 'utf8')) as Partial<ImportCase>
      if (!data.pdf || !data.expected) throw new Error(`${path.join(dir, file)}: needs "pdf" and "expected"`)
      cases.push({ ...(data as ImportCase), source, name: data.name ?? file.replace(/\.json$/, '') })
    }
  }
  return cases
}

/** The message of an error and of what caused it. */
function describeError(error: unknown): string {
  const parts: string[] = []
  for (let e: unknown = error, depth = 0; e instanceof Error && depth < 4; e = e.cause, depth++) parts.push(e.message)
  return parts.filter((m, i) => m && parts.indexOf(m) === i).join(' <- ')
}

async function main() {
  const { values } = parseArgs({
    options: {
      runs: { type: 'string' }, case: { type: 'string' }, show: { type: 'boolean' },
      'dry-run': { type: 'boolean' }, model: { type: 'string' }, help: { type: 'boolean' },
    },
  })
  if (values.help) return console.log(HELP)
  const runs = Math.max(1, Number(values.runs ?? 3) || 3)

  let cases = await loadCases()
  // The fictional cases only exercise the script: when you have resumes of your own, those are run.
  if (cases.some((c) => c.source === 'private')) cases = cases.filter((c) => c.source === 'private')
  if (values.case) cases = cases.filter((c) => c.name.includes(values.case!))
  if (cases.length === 0) {
    console.log('No case. Add one to eval/import/ (or eval/private/import/): see --help.')
    return
  }

  let wrong = 0
  let total = 0
  for (const c of cases) {
    const pdf = new Uint8Array(await fs.readFile(path.resolve(ROOT, c.pdf)))
    const read = await readPdfText(pdf)
    const { prompt, lines } = buildImportPrompt(read.text)
    console.log(`\n${c.name} (${c.source}): ${read.pagesRead}/${read.pages} pages, ${lines.length} lines, ${read.text.length} characters`)

    if (values['dry-run']) {
      console.log(`\n--- system\n${IMPORT_SYSTEM_PROMPT}\n--- prompt\n${prompt}\n--- schema\n${JSON.stringify(IMPORT_SCHEMA)}`)
      continue
    }

    for (let i = 1; i <= runs; i++) {
      total++
      const start = Date.now()
      try {
        const answer = await askGateway({ feature: 'import', userId: 'eval', system: IMPORT_SYSTEM_PROMPT, prompt, schema: IMPORT_SCHEMA })
        const { entries, dropped } = parseImportAnswer(answer.content, lines)
        const counts = Object.fromEntries(KINDS.map((k) => [k, entries[k].length])) as Counts
        const issues = problems(c.expected, counts)
        const cost = values.model ? costOf(values.model, answer.usage.prompt_tokens, answer.usage.completion_tokens) : null
        if (issues.length > 0) wrong++
        console.log(
          `  run ${i}/${runs}  ${issues.length === 0 ? 'OK   ' : 'WRONG'}  ` +
            KINDS.map((k) => `${k} ${counts[k]}`).join(', ') +
            `  | dropped ${dropped}, ${((Date.now() - start) / 1000).toFixed(1)} s, ${answer.usage.prompt_tokens}+${answer.usage.completion_tokens} tokens` +
            (cost !== null ? `, ${cost.toFixed(5)} EUR` : ''),
        )
        for (const issue of issues) console.log(`           ${issue}`)
        if (values.show) {
          for (const k of KINDS) {
            for (const e of entries[k] as Record<string, unknown>[]) {
              const main = String(e.title ?? e.name ?? e.degree ?? '')
              const who = String(e.company ?? e.institution ?? e.category ?? '')
              console.log(`           ${k.slice(0, 4)}  ${main} | ${who} | ${e.period ?? ''} | description ${String(e.description ?? '').length} characters`)
            }
          }
        }
      } catch (error) {
        wrong++
        console.log(`  run ${i}/${runs}  FAILED  ${describeError(error)}`)
      }
    }
  }
  if (values['dry-run']) return
  console.log(`\n${total - wrong} of ${total} runs gave what was expected.`)
  if (wrong > 0) process.exitCode = 1
}

main().catch((error) => {
  console.error(describeError(error))
  process.exitCode = 1
})
