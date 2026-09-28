import fs from 'fs/promises'
import path from 'path'
import pg from 'pg'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const jobsDir = path.join(process.cwd(), 'data', 'jobs')

async function readJsonSafe(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf-8'))
  } catch {
    return null
  }
}

async function main() {
  const ids = (await fs.readdir(jobsDir)).filter((e) => !e.startsWith('.'))
  console.log(`Found ${ids.length} jobs on disk`)

  for (const id of ids) {
    const dir = path.join(jobsDir, id)
    const offer = await readJsonSafe(path.join(dir, 'offer.json'))
    if (!offer) {
      console.warn(`  skip ${id}: no offer.json`)
      continue
    }
    const resumeConfig = await readJsonSafe(path.join(dir, 'resume-config.json'))
    const questions = await readJsonSafe(path.join(dir, 'questions.json'))

    await pool.query(
      `INSERT INTO jobs (id, company, title, description, location, url, status, date_added, tags, ats_tags, ai_analysis, resume_config, questions)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT (id) DO NOTHING`,
      [
        offer.id,
        offer.company,
        offer.title,
        offer.description,
        offer.location ?? null,
        offer.url ?? null,
        offer.status,
        offer.date_added,
        offer.tags ?? [],
        offer.ats_tags ?? [],
        offer.ai_analysis ? JSON.stringify(offer.ai_analysis) : null,
        JSON.stringify(resumeConfig ?? { selected_entity_ids: [], ai_rankings: [], profile_text: '' }),
        JSON.stringify(questions ?? []),
      ]
    )
    console.log(`  migrated ${id}`)
  }

  await pool.end()
  console.log('Done.')
}

main()
