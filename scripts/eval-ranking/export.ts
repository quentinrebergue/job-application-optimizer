/**
 * Turns one of my jobs (and my library) into an evaluation case in eval/private/.
 *
 *   npm run eval:export -- <job id>
 *
 * Then open the file and fill "expected" with the ids I would pick for this offer.
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { pool } from '@/lib/db'
import { getJob, getResumeProfile, listEntities } from '@/lib/data'
import { PRIVATE_DIR, type EvalCase } from './cases'

function label(e: unknown): string {
  const x = e as Record<string, string>
  return x.title ? `${x.title}${x.company ? ` @ ${x.company}` : ''}` : (x.name ?? x.degree ?? x.id)
}

async function main() {
  const jobId = process.argv[2]
  if (!jobId) throw new Error('Usage: npm run eval:export -- <job id>')
  const { rows } = await pool.query('SELECT user_id FROM jobs WHERE id = $1', [jobId])
  if (!rows[0]) throw new Error(`No job ${jobId} in the database (is DATABASE_URL the local one?)`)
  const userId: string = rows[0].user_id
  const job = await getJob(userId, jobId)
  if (!job) throw new Error('Job not found')

  const entities = {
    experiences: await listEntities(userId, 'experiences'),
    projects: await listEntities(userId, 'projects'),
    skills: await listEntities(userId, 'skills'),
    education: await listEntities(userId, 'education'),
  }
  const aiContext = job.resume_config.ai_context?.trim() || (await getResumeProfile(userId)).ai_context
  const slug = `${job.company}-${job.title}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || jobId
  const evalCase: EvalCase = {
    name: slug,
    source: 'private',
    job: { title: job.title, company: job.company, description: job.description },
    aiContext: aiContext || undefined,
    entities,
    expected: { experiences: [], projects: [], skills: [] },
  }

  await fs.mkdir(PRIVATE_DIR, { recursive: true })
  const file = path.join(PRIVATE_DIR, `${slug}.json`)
  await fs.writeFile(file, JSON.stringify(evalCase, null, 2))

  console.log(`Written: ${file}\nFill "expected" with the ids you would pick:\n`)
  for (const type of ['experiences', 'projects', 'skills'] as const) {
    console.log(type.toUpperCase())
    for (const e of entities[type]) console.log(`  ${e.id}  ${label(e)}`)
  }
  await pool.end()
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
