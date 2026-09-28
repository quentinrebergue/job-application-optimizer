import fs from 'fs/promises'
import path from 'path'
import pg from 'pg'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const dataDir = path.join(process.cwd(), 'data')

async function readJsonSafe(filePath) {
  try { return JSON.parse(await fs.readFile(filePath, 'utf-8')) } catch { return null }
}

async function migrateSentences() {
  const sentences = await readJsonSafe(path.join(dataDir, 'cover-letter', 'sentences.json'))
  if (!Array.isArray(sentences)) { console.warn('no sentences.json / not an array'); return }

  for (const s of sentences) {
    await pool.query(
      `INSERT INTO cover_letter_sentences (id, text, category, tags, created_at)
       VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING`,
      [s.id, s.text, s.category, s.tags ?? [], s.created_at]
    )
    console.log(`  migrated sentence ${s.id}`)
  }
}

async function migratePerJobConfigs() {
  const jobsDir = path.join(dataDir, 'jobs')
  const ids = (await fs.readdir(jobsDir)).filter((e) => !e.startsWith('.'))

  for (const id of ids) {
    const config = await readJsonSafe(path.join(jobsDir, id, 'cover-letter.json'))
    if (!config) continue
    await pool.query('UPDATE jobs SET cover_letter = $2 WHERE id = $1', [id, JSON.stringify(config)])
    console.log(`  migrated cover_letter for job ${id}`)
  }
}

async function main() {
  await migrateSentences()
  await migratePerJobConfigs()
  await pool.end()
  console.log('Done.')
}

main()
