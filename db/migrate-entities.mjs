import fs from 'fs/promises'
import path from 'path'
import pg from 'pg'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const entitiesDir = path.join(process.cwd(), 'data', 'entities')
const TYPES = ['experiences', 'projects', 'skills', 'education']

async function readJsonSafe(filePath) {
  try { return JSON.parse(await fs.readFile(filePath, 'utf-8')) } catch { return null }
}

async function main() {
  for (const type of TYPES) {
    const dir = path.join(entitiesDir, type)
    let ids
    try { ids = (await fs.readdir(dir)).filter((e) => !e.startsWith('.')) }
    catch { console.warn(`no dir for ${type}`); continue }

    for (const id of ids) {
      const meta = await readJsonSafe(path.join(dir, id, 'meta.json'))
      if (!meta) { console.warn(`  skip ${type}/${id}: no meta.json`); continue }
      const questions = await readJsonSafe(path.join(dir, id, 'questions.json'))
      const { id: metaId, type: metaType, tags, latex_snippet, ...rest } = meta

      await pool.query(
        `INSERT INTO entities (id, type, tags, latex_snippet, data, questions)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (id) DO NOTHING`,
        [metaId, metaType, tags ?? [], latex_snippet ?? '', JSON.stringify(rest), JSON.stringify(questions ?? [])]
      )
      console.log(`  migrated ${type}/${id}`)
    }
  }
  await pool.end()
  console.log('Done.')
}

main()
