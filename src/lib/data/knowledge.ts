import { v4 as uuidv4 } from 'uuid'
import type { KnowledgeItem, KnowledgeMeta } from '@/types'
import { pool } from '@/lib/db'

interface KnowledgeRow {
  id: string
  name: string
  category: string
  tags: string[]
}

function rowToMeta(row: KnowledgeRow): KnowledgeMeta {
  return { id: row.id, name: row.name, category: row.category, tags: row.tags }
}

export async function listKnowledge(): Promise<KnowledgeMeta[]> {
  const { rows } = await pool.query('SELECT * FROM knowledge ORDER BY id')
  return rows.map(rowToMeta)
}

export async function getKnowledge(id: string): Promise<KnowledgeItem | null> {
  const { rows } = await pool.query('SELECT * FROM knowledge WHERE id = $1', [id])
  if (rows.length === 0) return null
  return { ...rowToMeta(rows[0]), explanation: rows[0].explanation ?? '' } as KnowledgeItem
}

export async function createKnowledge(
  data: Omit<KnowledgeMeta, 'id'> & { explanation: string }
): Promise<KnowledgeMeta> {
  const id = `k-${uuidv4().slice(0, 8)}`
  const { rows } = await pool.query(
    `INSERT INTO knowledge (id, name, category, tags, explanation)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [id, data.name, data.category, data.tags ?? [], data.explanation]
  )
  return rowToMeta(rows[0])
}

export async function updateKnowledge(
  id: string,
  data: Partial<Omit<KnowledgeMeta, 'id'> & { explanation: string }>
): Promise<KnowledgeMeta | null> {
  const existing = await pool.query('SELECT * FROM knowledge WHERE id = $1', [id])
  if (existing.rows.length === 0) return null
  const merged = { ...existing.rows[0], ...data }
  const { rows } = await pool.query(
    `UPDATE knowledge SET name=$2, category=$3, tags=$4, explanation=$5 WHERE id=$1 RETURNING *`,
    [id, merged.name, merged.category, merged.tags ?? [], merged.explanation ?? '']
  )
  return rowToMeta(rows[0])
}

export async function deleteKnowledge(id: string): Promise<boolean> {
  const { rowCount } = await pool.query('DELETE FROM knowledge WHERE id = $1', [id])
  return (rowCount ?? 0) > 0
}
