import { v4 as uuidv4 } from 'uuid'
import type { GeneralQuestion } from '@/types'
import { pool } from '@/lib/db'

export async function listGeneralQuestions(): Promise<GeneralQuestion[]> {
  const { rows } = await pool.query('SELECT * FROM general_questions ORDER BY id')
  return rows
}

export async function createGeneralQuestion(
  data: Omit<GeneralQuestion, 'id'>
): Promise<GeneralQuestion> {
  const id = `gq-${uuidv4().slice(0, 8)}`
  const { rows } = await pool.query(
    `INSERT INTO general_questions (id, question, answer, tags)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [id, data.question, data.answer, data.tags ?? []]
  )
  return rows[0]
}

export async function updateGeneralQuestion(
  id: string,
  data: Partial<Omit<GeneralQuestion, 'id'>>
): Promise<GeneralQuestion | null> {
  const existing = await pool.query('SELECT * FROM general_questions WHERE id = $1', [id])
  if (existing.rows.length === 0) return null
  const merged = { ...existing.rows[0], ...data }
  const { rows } = await pool.query(
    `UPDATE general_questions SET question=$2, answer=$3, tags=$4 WHERE id=$1 RETURNING *`,
    [id, merged.question, merged.answer, merged.tags ?? []]
  )
  return rows[0]
}

export async function deleteGeneralQuestion(id: string): Promise<boolean> {
  const { rowCount } = await pool.query('DELETE FROM general_questions WHERE id = $1', [id])
  return (rowCount ?? 0) > 0
}
