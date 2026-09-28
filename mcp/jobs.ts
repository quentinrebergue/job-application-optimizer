import fs from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'

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

export async function readJob(jobsDir: string, id: string): Promise<JobMeta | null> {
  try {
    const raw = await fs.readFile(path.join(jobsDir, id, 'offer.json'), 'utf-8')
    return JSON.parse(raw) as JobMeta
  } catch {
    return null
  }
}

export async function listJobs(jobsDir: string): Promise<JobMeta[]> {
  try {
    const entries = await fs.readdir(jobsDir)
    const results = await Promise.all(
      entries.filter((e) => e.startsWith('job-')).map((id) => readJob(jobsDir, id))
    )
    return results.filter((j): j is JobMeta => j !== null)
  } catch {
    return []
  }
}

export async function createJob(
  jobsDir: string,
  opts: { title: string; company: string; description?: string; location?: string; url?: string; status?: string; tags?: string[] }
): Promise<JobMeta> {
  const id = `job-${randomUUID().slice(0, 8)}`
  const job: JobMeta = {
    id,
    title: opts.title.trim(),
    company: opts.company.trim(),
    description: (opts.description ?? '').trim(),
    location: opts.location?.trim() || undefined,
    url: opts.url?.trim() || undefined,
    status: (opts.status as ApplicationStatus) ?? 'saved',
    date_added: new Date().toISOString(),
    tags: opts.tags ?? [],
  }
  await fs.mkdir(path.join(jobsDir, id), { recursive: true })
  await fs.mkdir(path.join(jobsDir, id, 'generated'), { recursive: true })
  await fs.writeFile(path.join(jobsDir, id, 'offer.json'), JSON.stringify(job, null, 2))
  await fs.writeFile(
    path.join(jobsDir, id, 'resume-config.json'),
    JSON.stringify({ selected_entity_ids: [], ai_rankings: [] }, null, 2)
  )
  return job
}

export async function updateJobStatus(
  jobsDir: string,
  id: string,
  status: ApplicationStatus
): Promise<{ prev: ApplicationStatus; job: JobMeta } | null> {
  const job = await readJob(jobsDir, id)
  if (!job) return null
  const prev = job.status
  job.status = status
  await fs.writeFile(path.join(jobsDir, id, 'offer.json'), JSON.stringify(job, null, 2))
  return { prev, job }
}

export async function updateJobTags(
  jobsDir: string,
  id: string,
  tags: string[]
): Promise<JobMeta | null> {
  const job = await readJob(jobsDir, id)
  if (!job) return null
  job.tags = tags
  await fs.writeFile(path.join(jobsDir, id, 'offer.json'), JSON.stringify(job, null, 2))
  return job
}

export async function setJobProfile(
  jobsDir: string,
  id: string,
  profileText: string
): Promise<boolean> {
  const configPath = path.join(jobsDir, id, 'resume-config.json')
  let config: Record<string, unknown> = { selected_entity_ids: [], ai_rankings: [] }
  try {
    const raw = await fs.readFile(configPath, 'utf-8')
    config = JSON.parse(raw)
  } catch {
    // file missing — use default
  }
  config.profile_text = profileText
  await fs.writeFile(configPath, JSON.stringify(config, null, 2))
  return true
}
