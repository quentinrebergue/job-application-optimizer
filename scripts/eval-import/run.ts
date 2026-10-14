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
import { redactPersonal } from '@/lib/import/personal'
import { cleanText } from '@/lib/import/clean'
import { ENTRY_KINDS, scoreImport, type Score, type Truth } from './score'

interface ImportCase {
  name: string
  source: 'example' | 'private'
  /** The PDF: a path from the root of the repository, or an absolute one. */
  pdf: string
  /** Counts per kind (the older, rougher check)... */
  expected?: Expected
  /** ...or what a person would have typed, compared field by field (score.ts). */
  truth?: Truth
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
or, compared field by field:
  { "pdf": "...", "truth": { "profile": { "full_name": "...", "email": "...", "linkedin": { "optional": "..." } },
    "experiences": [{ "title": "...", "company": "...", "period": "..." }], "projects": [{ "title": "..." }],
    "education": [{ "degree": "...", "institution": "...", "period": "..." }], "skills": { "min": 2, "max": 10 } } }

  --runs n        Runs per case (default 3): the same resume does not always give the same answer.
  --case text     Only the cases whose name contains this text.
  --show          Print what each run gave: entries with their fields (personal data on your screen).
  --raw           Print the answer of the model as it came, formatted (to see what the checks dropped).
  --dry-run       The text as the model reads it (numbered lines) and the request; no call to the AI.
  --model name    The model the gateway runs: it sets the cost (see src/lib/ai/prices.ts).
  --help          This text.`

async function loadCases(): Promise<ImportCase[]> {
  const cases: ImportCase[] = []
  for (const { dir, source } of DIRS) {
    const files = await fs.readdir(dir).catch(() => [])
    for (const file of files.filter((f) => f.endsWith('.json') && !f.startsWith('_')).sort()) {
      const data = JSON.parse(await fs.readFile(path.join(dir, file), 'utf8')) as Partial<ImportCase>
      if (!data.pdf || (!data.expected && !data.truth)) throw new Error(`${path.join(dir, file)}: needs "pdf" and "expected" or "truth"`)
      cases.push({ ...(data as ImportCase), source, name: data.name ?? file.replace(/\.json$/, '') })
    }
  }
  return cases
}

/** The details of the person (from the truth of the case) that the request to the AI still holds: none, or a leak. */
function leaksOf(truth: Truth | undefined, prompt: string): string[] {
  const p = truth?.profile ?? {}
  const values = (spec: unknown): string[] =>
    typeof spec === 'string' ? [spec] : spec && typeof spec === 'object' ? Object.values(spec).flat().map(String) : []
  const plain = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
  const sent = plain(prompt)
  const leaks: string[] = []
  for (const name of values(p.full_name)) {
    for (const word of name.split(/[\s-]+/).filter((w) => w.length >= 3)) {
      if (new RegExp(`(?<![\\p{L}])${plain(word).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}])`, 'u').test(sent)) leaks.push(`the name (${word})`)
    }
  }
  for (const email of values(p.email)) if (sent.includes(plain(email))) leaks.push('the email')
  for (const phone of values(p.phone)) if (sent.replace(/\D/g, '').includes(phone.replace(/\D/g, ''))) leaks.push('the phone')
  return leaks
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
      'dry-run': { type: 'boolean' }, model: { type: 'string' }, help: { type: 'boolean' }, raw: { type: 'boolean' },
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
  const scores: Score[] = []
  for (const c of cases) {
    const pdf = new Uint8Array(await fs.readFile(path.resolve(ROOT, c.pdf)))
    const read = await readPdfText(pdf)
    // As the route does: the name, email, phone and links are taken out by code before the AI.
    const { personal, text: redacted } = redactPersonal(cleanText(read.text))
    const { prompt, lines } = buildImportPrompt(redacted)
    const leaks = leaksOf(c.truth, prompt)
    if (leaks.length > 0) console.log(`  LEAK: the request holds ${leaks.join(', ')} of the person`)
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
        if (values.raw) console.log(JSON.stringify(answer.content, null, 2))
        const parsed = parseImportAnswer(answer.content, lines)
        const { entries, dropped } = parsed
        const profile = { ...personal, ...parsed.profile }
        const counts = Object.fromEntries(KINDS.map((k) => [k, entries[k].length])) as Counts
        const cost = values.model ? costOf(values.model, answer.usage.prompt_tokens, answer.usage.completion_tokens) : null
        const tail = `  | ${answer.model ?? 'model?'}, dropped ${dropped}, ${((Date.now() - start) / 1000).toFixed(1)} s, ${answer.usage.prompt_tokens}+${answer.usage.completion_tokens} tokens` +
          (cost !== null ? `, ${cost.toFixed(5)} EUR` : '')
        let issues: string[]
        if (c.truth) {
          const s = scoreImport(c.truth, { profile, ...entries } as never)
          scores.push(s)
          issues = [...s.profile.problems, ...ENTRY_KINDS.flatMap((k) => s.kinds[k].problems), ...(s.skills.ok ? [] : [`skills: ${s.skills.count}, expected ${JSON.stringify(c.truth.skills)}`])]
          const k = (kind: (typeof ENTRY_KINDS)[number]) => `${kind.slice(0, 4)} ${s.kinds[kind].found}/${s.kinds[kind].expected}${s.kinds[kind].extra ? ` +${s.kinds[kind].extra}` : ''}`
          const fields = ENTRY_KINDS.reduce((n, kind) => n + s.kinds[kind].fieldsRight, 0)
          const allFields = ENTRY_KINDS.reduce((n, kind) => n + s.kinds[kind].fields, 0)
          console.log(`  run ${i}/${runs}  ${s.perfect ? 'OK   ' : 'WRONG'}  ${ENTRY_KINDS.map(k).join(', ')}, fields ${fields}/${allFields}, profile ${s.profile.right}/${s.profile.total}, skills ${s.skills.count}${tail}`)
          if (!s.perfect || leaks.length > 0) wrong++
        } else {
          issues = problems(c.expected ?? {}, counts)
          if (issues.length > 0) wrong++
          console.log(`  run ${i}/${runs}  ${issues.length === 0 ? 'OK   ' : 'WRONG'}  ` + KINDS.map((k) => `${k} ${counts[k]}`).join(', ') + tail)
        }
        // The problems name entries of the resume: printed with --show only.
        if (values.show) for (const issue of issues) console.log(`           ${issue}`)
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
  if (scores.length > 0) {
    // The figures to compare two versions of the prompt with: summed over every run of every case.
    const sum = (f: (s: Score) => number) => scores.reduce((n, s) => n + f(s), 0)
    const pct = (a: number, b: number) => (b === 0 ? '-' : `${((100 * a) / b).toFixed(1)} %`)
    const expected = sum((s) => ENTRY_KINDS.reduce((n, k) => n + s.kinds[k].expected, 0))
    const found = sum((s) => ENTRY_KINDS.reduce((n, k) => n + s.kinds[k].found, 0))
    const extra = sum((s) => ENTRY_KINDS.reduce((n, k) => n + s.kinds[k].extra, 0))
    const fieldsRight = sum((s) => ENTRY_KINDS.reduce((n, k) => n + s.kinds[k].fieldsRight, 0))
    const fields = sum((s) => ENTRY_KINDS.reduce((n, k) => n + s.kinds[k].fields, 0))
    console.log(
      `Entries found (recall) ${pct(found, expected)}, of those given the expected ones (precision) ${pct(found, found + extra)}, ` +
        `fields right ${pct(fieldsRight, fields)}, profile right ${pct(sum((s) => s.profile.right), sum((s) => s.profile.total))}, ` +
        `skills in range ${pct(scores.filter((s) => s.skills.ok).length, scores.length)}.`,
    )
  }
  if (wrong > 0) process.exitCode = 1
}

main().catch((error) => {
  console.error(describeError(error))
  process.exitCode = 1
})
