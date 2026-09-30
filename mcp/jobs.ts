import { randomUUID } from 'crypto'
import { pool } from './db.js'

export type ApplicationStatus = 'saved' | 'applied' | 'interview' | 'offer' | 'rejected'

export interface JobMeta {
  id: string
  title: string
  company: string
  description: string
  location?: string
  url?: string
  status: ApplicationStatus
  date_added: string
  tags: string[]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToJobMeta(row: any): JobMeta {
  return {
    id: row.id,
    title: row.title,
    company: row.company,
    description: row.description,
    location: row.location ?? undefined,
    url: row.url ?? undefined,
    status: row.status,
    date_added: row.date_added.toISOString(),
    tags: row.tags,
  }
}

export async function readJob(id: string): Promise<JobMeta | null> {
  const { rows } = await pool.query('SELECT * FROM jobs WHERE id = $1', [id])
  if (rows.length === 0) return null
  return rowToJobMeta(rows[0])
}

export async function listJobs(): Promise<JobMeta[]> {
  const { rows } = await pool.query('SELECT * FROM jobs ORDER BY date_added DESC')
  return rows.map(rowToJobMeta)
}

export async function createJob(
  opts: { title: string; company: string; description?: string; location?: string; url?: string; status?: string; tags?: string[] }
): Promise<JobMeta> {
  const id = `job-${randomUUID().slice(0, 8)}`
  const { rows } = await pool.query(
    `INSERT INTO jobs (id, company, title, description, location, url, status, tags)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      id,
      opts.company.trim(),
      opts.title.trim(),
      (opts.description ?? '').trim(),
      opts.location?.trim() || null,
      opts.url?.trim() || null,
      (opts.status as ApplicationStatus) ?? 'saved',
      opts.tags ?? [],
    ]
  )
  return rowToJobMeta(rows[0])
}

export async function updateJobStatus(
  id: string,
  status: ApplicationStatus
): Promise<{ prev: ApplicationStatus; job: JobMeta } | null> {
  const job = await readJob(id)
  if (!job) return null
  const prev = job.status
  const { rows } = await pool.query('UPDATE jobs SET status = $2 WHERE id = $1 RETURNING *', [id, status])
  return { prev, job: rowToJobMeta(rows[0]) }
}

export async function updateJobTags(
  id: string,
  tags: string[]
): Promise<JobMeta | null> {
  const { rows } = await pool.query('UPDATE jobs SET tags = $2 WHERE id = $1 RETURNING *', [id, tags])
  if (rows.length === 0) return null
  return rowToJobMeta(rows[0])
}

export async function setJobProfile(
  id: string,
  profileText: string
): Promise<boolean> {
  const { rowCount } = await pool.query(
    `UPDATE jobs SET resume_config = jsonb_set(
       COALESCE(resume_config, '{"selected_entity_ids":[],"ai_rankings":[]}'::jsonb),
       '{profile_text}', to_jsonb($2::text)
     ) WHERE id = $1`,
    [id, profileText]
  )
  return (rowCount ?? 0) > 0
}

export async function setJobAiContext(
  id: string,
  aiContext: string
): Promise<boolean> {
  const { rowCount } = await pool.query(
    `UPDATE jobs SET resume_config = jsonb_set(
       COALESCE(resume_config, '{"selected_entity_ids":[],"ai_rankings":[]}'::jsonb),
       '{ai_context}', to_jsonb($2::text)
     ) WHERE id = $1`,
    [id, aiContext]
  )
  return (rowCount ?? 0) > 0
}
