import fs from 'fs/promises'
import path from 'path'
import pg from 'pg'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const codingDir = path.join(process.cwd(), 'data', 'coding')

async function readJsonSafe(filePath) {
  try { return JSON.parse(await fs.readFile(filePath, 'utf-8')) } catch { return null }
}
async function readFileSafe(filePath) {
  try { return await fs.readFile(filePath, 'utf-8') } catch { return null }
}

async function migrateKnowledge() {
  const dir = path.join(codingDir, 'knowledge')
  let ids
  try { ids = (await fs.readdir(dir)).filter((e) => !e.startsWith('.')) }
  catch { console.warn('no knowledge dir'); return }

  for (const id of ids) {
    const meta = await readJsonSafe(path.join(dir, id, 'meta.json'))
    if (!meta) { console.warn(`  skip knowledge/${id}: no meta.json`); continue }
    const explanation = (await readFileSafe(path.join(dir, id, 'explanation.md'))) ?? ''
    await pool.query(
      `INSERT INTO knowledge (id, name, category, tags, explanation)
       VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING`,
      [meta.id, meta.name, meta.category, meta.tags ?? [], explanation]
    )
    console.log(`  migrated knowledge/${id}`)
  }
}

async function migrateExercises() {
  const dir = path.join(codingDir, 'exercises')
  let ids
  try { ids = (await fs.readdir(dir)).filter((e) => !e.startsWith('.')) }
  catch { console.warn('no exercises dir'); return }

  for (const id of ids) {
    const meta = await readJsonSafe(path.join(dir, id, 'meta.json'))
    if (!meta) { console.warn(`  skip exercises/${id}: no meta.json`); continue }
    const description = (await readFileSafe(path.join(dir, id, 'description.md'))) ?? ''
    const steps = (await readFileSafe(path.join(dir, id, 'solution', 'steps.md'))) ?? ''
    const code = (await readFileSafe(path.join(dir, id, 'solution', 'code.py'))) ?? ''
    await pool.query(
      `INSERT INTO exercises (id, title, difficulty, knowledge_ids, tags, category, leetcode, pattern_justifications, description, steps, code)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (id) DO NOTHING`,
      [
        meta.id, meta.title, meta.difficulty, meta.knowledge_ids ?? [], meta.tags ?? [],
        meta.category ?? null, meta.leetcode ?? null,
        meta.patternJustifications ? JSON.stringify(meta.patternJustifications) : null,
        description, steps, code,
      ]
    )
    console.log(`  migrated exercises/${id}`)
  }
}

async function main() {
  await migrateKnowledge()
  await migrateExercises()
  await pool.end()
  console.log('Done.')
}

main()
