import { v4 as uuidv4 } from 'uuid'
import type { CoverLetterSentence, JobCoverLetterConfig } from '@/types/cover-letter'
import { pool } from '@/lib/db'

const DEFAULT_JOB_COVER_LETTER: JobCoverLetterConfig = {
  selected_sentence_ids: [],
  generated_letter: '',
  ai_context: '',
}

// ─── Sentence bank ────────────────────────────────────────────────────────────

export async function listSentences(userId: string): Promise<CoverLetterSentence[]> {
  const { rows } = await pool.query(
    'SELECT * FROM cover_letter_sentences WHERE user_id = $1 ORDER BY created_at',
    [userId]
  )
  return rows.map((r) => ({ ...r, created_at: r.created_at.toISOString() }))
}

export async function createSentence(
  userId: string,
  data: Omit<CoverLetterSentence, 'id' | 'created_at'>
): Promise<CoverLetterSentence> {
  const id = `cls-${uuidv4().slice(0, 8)}`
  const { rows } = await pool.query(
    `INSERT INTO cover_letter_sentences (id, user_id, text, category, tags)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [id, userId, data.text, data.category, data.tags ?? []]
  )
  return { ...rows[0], created_at: rows[0].created_at.toISOString() }
}

export async function updateSentence(
  userId: string,
  id: string,
  data: Partial<Omit<CoverLetterSentence, 'id' | 'created_at'>>
): Promise<CoverLetterSentence | null> {
  const existing = await pool.query(
    'SELECT * FROM cover_letter_sentences WHERE user_id = $1 AND id = $2',
    [userId, id]
  )
  if (existing.rows.length === 0) return null
  const merged = { ...existing.rows[0], ...data }
  const { rows } = await pool.query(
    `UPDATE cover_letter_sentences SET text=$3, category=$4, tags=$5 WHERE user_id=$1 AND id=$2 RETURNING *`,
    [userId, id, merged.text, merged.category, merged.tags ?? []]
  )
  return { ...rows[0], created_at: rows[0].created_at.toISOString() }
}

export async function deleteSentence(userId: string, id: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    'DELETE FROM cover_letter_sentences WHERE user_id = $1 AND id = $2',
    [userId, id]
  )
  return (rowCount ?? 0) > 0
}

// ─── Per-job cover letter config (stored on the jobs table itself) ───────────

export async function getJobCoverLetter(userId: string, jobId: string): Promise<JobCoverLetterConfig> {
  const { rows } = await pool.query(
    'SELECT cover_letter FROM jobs WHERE user_id = $1 AND id = $2',
    [userId, jobId]
  )
  return rows[0]?.cover_letter ?? DEFAULT_JOB_COVER_LETTER
}

export async function saveJobCoverLetter(
  userId: string,
  jobId: string,
  config: JobCoverLetterConfig
): Promise<void> {
  await pool.query(
    'UPDATE jobs SET cover_letter = $3 WHERE user_id = $1 AND id = $2',
    [userId, jobId, JSON.stringify(config)]
  )
}
