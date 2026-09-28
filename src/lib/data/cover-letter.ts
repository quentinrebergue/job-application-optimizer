import { v4 as uuidv4 } from 'uuid'
import type { CoverLetterSentence, JobCoverLetterConfig } from '@/types/cover-letter'
import { pool } from '@/lib/db'

const DEFAULT_JOB_COVER_LETTER: JobCoverLetterConfig = {
  selected_sentence_ids: [],
  generated_letter: '',
  ai_context: '',
}

// ─── Sentence bank ────────────────────────────────────────────────────────────

export async function listSentences(): Promise<CoverLetterSentence[]> {
  const { rows } = await pool.query('SELECT * FROM cover_letter_sentences ORDER BY created_at')
  return rows.map((r) => ({ ...r, created_at: r.created_at.toISOString() }))
}

export async function createSentence(
  data: Omit<CoverLetterSentence, 'id' | 'created_at'>
): Promise<CoverLetterSentence> {
  const id = `cls-${uuidv4().slice(0, 8)}`
  const { rows } = await pool.query(
    `INSERT INTO cover_letter_sentences (id, text, category, tags)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [id, data.text, data.category, data.tags ?? []]
  )
  return { ...rows[0], created_at: rows[0].created_at.toISOString() }
}

export async function updateSentence(
  id: string,
  data: Partial<Omit<CoverLetterSentence, 'id' | 'created_at'>>
): Promise<CoverLetterSentence | null> {
  const existing = await pool.query('SELECT * FROM cover_letter_sentences WHERE id = $1', [id])
  if (existing.rows.length === 0) return null
  const merged = { ...existing.rows[0], ...data }
  const { rows } = await pool.query(
    `UPDATE cover_letter_sentences SET text=$2, category=$3, tags=$4 WHERE id=$1 RETURNING *`,
    [id, merged.text, merged.category, merged.tags ?? []]
  )
  return { ...rows[0], created_at: rows[0].created_at.toISOString() }
}

export async function deleteSentence(id: string): Promise<boolean> {
  const { rowCount } = await pool.query('DELETE FROM cover_letter_sentences WHERE id = $1', [id])
  return (rowCount ?? 0) > 0
}

// ─── Per-job cover letter config (stored on the jobs table itself) ───────────

export async function getJobCoverLetter(jobId: string): Promise<JobCoverLetterConfig> {
  const { rows } = await pool.query('SELECT cover_letter FROM jobs WHERE id = $1', [jobId])
  return rows[0]?.cover_letter ?? DEFAULT_JOB_COVER_LETTER
}

export async function saveJobCoverLetter(
  jobId: string,
  config: JobCoverLetterConfig
): Promise<void> {
  await pool.query('UPDATE jobs SET cover_letter = $2 WHERE id = $1', [jobId, JSON.stringify(config)])
}
