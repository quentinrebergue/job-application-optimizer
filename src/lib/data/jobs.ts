import { v4 as uuidv4 } from 'uuid'
import type { JobOffer, JobWithConfig, ResumeConfig } from '@/types'
import { pool } from '@/lib/db'

const DEFAULT_RESUME_CONFIG: ResumeConfig = {
  selected_entity_ids: [],
  ai_rankings: [],
  profile_text: '',
}

interface JobRow {
  id: string
  company: string
  title: string
  description: string
  location: string | null
  url: string | null
  status: JobOffer['status']
  date_added: Date
  tags: string[]
  ats_tags: string[] | null
  ai_analysis: JobOffer['ai_analysis'] | null
  resume_config: ResumeConfig | null
}

function rowToJobOffer(row: JobRow): JobOffer {
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
    ats_tags: row.ats_tags ?? undefined,
    ai_analysis: row.ai_analysis ?? undefined,
  }
}

export async function listJobs(userId: string): Promise<JobOffer[]> {
  const { rows } = await pool.query(
    'SELECT * FROM jobs WHERE user_id = $1 ORDER BY date_added DESC',
    [userId]
  )
  return rows.map(rowToJobOffer)
}

export async function getJob(userId: string, id: string): Promise<JobWithConfig | null> {
  const { rows } = await pool.query(
    'SELECT * FROM jobs WHERE user_id = $1 AND id = $2',
    [userId, id]
  )
  if (rows.length === 0) return null
  return { ...rowToJobOffer(rows[0]), resume_config: rows[0].resume_config ?? DEFAULT_RESUME_CONFIG }
}

export async function createJob(
  userId: string,
  data: Omit<JobOffer, 'id' | 'date_added'>
): Promise<JobOffer> {
  const id = `job-${uuidv4().slice(0, 8)}`
  // tags and ats_tags are NOT NULL: an omitted list must be [] (undefined is sent as NULL, #97).
  const { rows } = await pool.query(
    `INSERT INTO jobs (id, user_id, company, title, description, location, url, status, tags, ats_tags)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [id, userId, data.company, data.title, data.description, data.location ?? null, data.url ?? null,
     data.status, data.tags ?? [], data.ats_tags ?? []]
  )
  return rowToJobOffer(rows[0])
}

export async function updateJob(
  userId: string,
  id: string,
  data: Partial<Omit<JobOffer, 'id'>>
): Promise<JobOffer | null> {
  const existing = await pool.query('SELECT * FROM jobs WHERE user_id = $1 AND id = $2', [userId, id])
  if (existing.rows.length === 0) return null
  const merged = { ...rowToJobOffer(existing.rows[0]), ...data }
  const { rows } = await pool.query(
    `UPDATE jobs SET company=$3, title=$4, description=$5, location=$6, url=$7,
     status=$8, tags=$9, ats_tags=$10, ai_analysis=$11
     WHERE user_id=$1 AND id=$2 RETURNING *`,
    [userId, id, merged.company, merged.title, merged.description, merged.location ?? null,
     merged.url ?? null, merged.status, merged.tags, merged.ats_tags ?? [],
     merged.ai_analysis ? JSON.stringify(merged.ai_analysis) : null]
  )
  return rowToJobOffer(rows[0])
}

export async function deleteJob(userId: string, id: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    'DELETE FROM jobs WHERE user_id = $1 AND id = $2',
    [userId, id]
  )
  return (rowCount ?? 0) > 0
}

export async function getResumeConfig(userId: string, id: string): Promise<ResumeConfig> {
  const { rows } = await pool.query(
    'SELECT resume_config FROM jobs WHERE user_id = $1 AND id = $2',
    [userId, id]
  )
  return rows[0]?.resume_config ?? DEFAULT_RESUME_CONFIG
}

export async function saveResumeConfig(userId: string, id: string, config: ResumeConfig): Promise<void> {
  await pool.query(
    'UPDATE jobs SET resume_config = $3 WHERE user_id = $1 AND id = $2',
    [userId, id, JSON.stringify(config)]
  )
}
