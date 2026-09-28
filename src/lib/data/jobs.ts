import { v4 as uuidv4 } from 'uuid'
import type { JobOffer, JobWithConfig, ResumeConfig } from '@/types'
import type { EntityQuestion } from '@/types'
import { pool } from '@/lib/db'

const DEFAULT_RESUME_CONFIG: ResumeConfig = {
  selected_entity_ids: [],
  ai_rankings: [],
  profile_text: '',
}

function rowToJobOffer(row: any): JobOffer {
  return {
    id: row.id,
    company: row.company,
    title: row.title,
    description: row.description,
    location: row.location ?? undefined,
    url: row.url ?? undefined,
    status: row.status,
    date_added: row.date_added.toISOString(),
    tags: row.tags,
    ats_tags: row.ats_tags,
    ai_analysis: row.ai_analysis ?? undefined,
  }
}

export async function listJobs(): Promise<JobOffer[]> {
  const { rows } = await pool.query('SELECT * FROM jobs ORDER BY date_added DESC')
  return rows.map(rowToJobOffer)
}

export async function getJob(id: string): Promise<JobWithConfig | null> {
  const { rows } = await pool.query('SELECT * FROM jobs WHERE id = $1', [id])
  if (rows.length === 0) return null
  return { ...rowToJobOffer(rows[0]), resume_config: rows[0].resume_config ?? DEFAULT_RESUME_CONFIG }
}

export async function createJob(
  data: Omit<JobOffer, 'id' | 'date_added'>
): Promise<JobOffer> {
  const id = `job-${uuidv4().slice(0, 8)}`
  const { rows } = await pool.query(
    `INSERT INTO jobs (id, company, title, description, location, url, status, tags, ats_tags)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [id, data.company, data.title, data.description, data.location ?? null, data.url ?? null,
     data.status, data.tags, data.ats_tags ?? []]
  )
  return rowToJobOffer(rows[0])
}

export async function updateJob(
  id: string,
  data: Partial<Omit<JobOffer, 'id'>>
): Promise<JobOffer | null> {
  const existing = await pool.query('SELECT * FROM jobs WHERE id = $1', [id])
  if (existing.rows.length === 0) return null
  const merged = { ...rowToJobOffer(existing.rows[0]), ...data }
  const { rows } = await pool.query(
    `UPDATE jobs SET company=$2, title=$3, description=$4, location=$5, url=$6,
     status=$7, tags=$8, ats_tags=$9, ai_analysis=$10
     WHERE id=$1 RETURNING *`,
    [id, merged.company, merged.title, merged.description, merged.location ?? null,
     merged.url ?? null, merged.status, merged.tags, merged.ats_tags ?? [],
     merged.ai_analysis ? JSON.stringify(merged.ai_analysis) : null]
  )
  return rowToJobOffer(rows[0])
}

export async function deleteJob(id: string): Promise<boolean> {
  const { rowCount } = await pool.query('DELETE FROM jobs WHERE id = $1', [id])
  return (rowCount ?? 0) > 0
}

export async function getResumeConfig(id: string): Promise<ResumeConfig> {
  const { rows } = await pool.query('SELECT resume_config FROM jobs WHERE id = $1', [id])
  return rows[0]?.resume_config ?? DEFAULT_RESUME_CONFIG
}

export async function saveResumeConfig(id: string, config: ResumeConfig): Promise<void> {
  await pool.query('UPDATE jobs SET resume_config = $2 WHERE id = $1', [id, JSON.stringify(config)])
}

export async function getJobQuestions(id: string): Promise<EntityQuestion[]> {
  const { rows } = await pool.query('SELECT questions FROM jobs WHERE id = $1', [id])
  return rows[0]?.questions ?? []
}

export async function saveJobQuestions(id: string, questions: EntityQuestion[]): Promise<void> {
  await pool.query('UPDATE jobs SET questions = $2 WHERE id = $1', [id, JSON.stringify(questions)])
}
