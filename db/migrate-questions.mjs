import fs from 'fs/promises'
import path from 'path'
import pg from 'pg'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const dir = path.join(process.cwd(), 'data', 'general-questions')

async function main() {
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith('.json') && !f.startsWith('.'))
  console.log(`Found ${files.length} general questions`)

  for (const file of files) {
    let q
    try {
      q = JSON.parse(await fs.readFile(path.join(dir, file), 'utf-8'))
    } catch {
      console.warn(`  skip ${file}: invalid JSON`)
      continue
    }
    await pool.query(
      `INSERT INTO general_questions (id, question, answer, tags)
       VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO NOTHING`,
      [q.id, q.question, q.answer, q.tags ?? []]
    )
    console.log(`  migrated ${q.id}`)
  }
  await pool.end()
  console.log('Done.')
}

main()
