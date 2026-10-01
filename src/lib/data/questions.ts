import { v4 as uuidv4 } from 'uuid'
import type { GeneralQuestion } from '@/types'
import { pool } from '@/lib/db'

export async function listGeneralQuestions(userId: string): Promise<GeneralQuestion[]> {
  const { rows } = await pool.query(
    'SELECT * FROM general_questions WHERE user_id = $1 ORDER BY id',
    [userId]
  )
  return rows
}

export async function createGeneralQuestion(
  userId: string,
  data: Omit<GeneralQuestion, 'id'>
): Promise<GeneralQuestion> {
  const id = `gq-${uuidv4().slice(0, 8)}`
  const { rows } = await pool.query(
    `INSERT INTO general_questions (id, user_id, question, answer, tags)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [id, userId, data.question, data.answer, data.tags ?? []]
  )
  return rows[0]
}

export async function updateGeneralQuestion(
  userId: string,
  id: string,
  data: Partial<Omit<GeneralQuestion, 'id'>>
): Promise<GeneralQuestion | null> {
  const existing = await pool.query(
    'SELECT * FROM general_questions WHERE user_id = $1 AND id = $2',
    [userId, id]
  )
  if (existing.rows.length === 0) return null
  const merged = { ...existing.rows[0], ...data }
  const { rows } = await pool.query(
    `UPDATE general_questions SET question=$3, answer=$4, tags=$5 WHERE user_id=$1 AND id=$2 RETURNING *`,
    [userId, id, merged.question, merged.answer, merged.tags ?? []]
  )
  return rows[0]
}

export async function deleteGeneralQuestion(userId: string, id: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    'DELETE FROM general_questions WHERE user_id = $1 AND id = $2',
    [userId, id]
  )
  return (rowCount ?? 0) > 0
}
