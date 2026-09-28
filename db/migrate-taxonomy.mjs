import fs from 'fs/promises'
import path from 'path'
import pg from 'pg'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const treePath = path.join(process.cwd(), 'data', 'taxonomy', 'tree.json')

async function main() {
  const raw = JSON.parse(await fs.readFile(treePath, 'utf-8'))
  await pool.query(
    `INSERT INTO taxonomy (id, data) VALUES (1, $1)
     ON CONFLICT (id) DO UPDATE SET data = $1`,
    [JSON.stringify(raw)]
  )
  await pool.end()
  console.log('Migrated taxonomy tree.')
}

main()
