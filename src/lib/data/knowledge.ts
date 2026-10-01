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

export async function listKnowledge(userId: string): Promise<KnowledgeMeta[]> {
  const { rows } = await pool.query('SELECT * FROM knowledge WHERE user_id = $1 ORDER BY id', [userId])
  return rows.map(rowToMeta)
}

export async function getKnowledge(userId: string, id: string): Promise<KnowledgeItem | null> {
  const { rows } = await pool.query(
    'SELECT * FROM knowledge WHERE user_id = $1 AND id = $2',
    [userId, id]
  )
  if (rows.length === 0) return null
  return { ...rowToMeta(rows[0]), explanation: rows[0].explanation ?? '' } as KnowledgeItem
}

export async function createKnowledge(
  userId: string,
  data: Omit<KnowledgeMeta, 'id'> & { explanation: string }
): Promise<KnowledgeMeta> {
  const id = `k-${uuidv4().slice(0, 8)}`
  const { rows } = await pool.query(
    `INSERT INTO knowledge (id, user_id, name, category, tags, explanation)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [id, userId, data.name, data.category, data.tags ?? [], data.explanation]
  )
  return rowToMeta(rows[0])
}

export async function updateKnowledge(
  userId: string,
  id: string,
  data: Partial<Omit<KnowledgeMeta, 'id'> & { explanation: string }>
): Promise<KnowledgeMeta | null> {
  const existing = await pool.query('SELECT * FROM knowledge WHERE user_id = $1 AND id = $2', [userId, id])
  if (existing.rows.length === 0) return null
  const merged = { ...existing.rows[0], ...data }
  const { rows } = await pool.query(
    `UPDATE knowledge SET name=$3, category=$4, tags=$5, explanation=$6 WHERE user_id=$1 AND id=$2 RETURNING *`,
    [userId, id, merged.name, merged.category, merged.tags ?? [], merged.explanation ?? '']
  )
  return rowToMeta(rows[0])
}

export async function deleteKnowledge(userId: string, id: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    'DELETE FROM knowledge WHERE user_id = $1 AND id = $2',
    [userId, id]
  )
  return (rowCount ?? 0) > 0
}
