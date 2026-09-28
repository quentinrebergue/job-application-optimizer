import path from 'path'
import fs from 'fs/promises'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import type { JobOffer, JobWithConfig, ResumeConfig } from '@/types'
import type { EntityQuestion } from '@/types'
import { JobOfferSchema, ResumeConfigSchema, EntityQuestionSchema } from '@/schemas'
import { readJsonSafe } from './_utils'

const DATA_DIR = path.join(process.cwd(), 'data')

function jobDir(id: string): string {
  return path.join(DATA_DIR, 'jobs', id)
}

const DEFAULT_RESUME_CONFIG: ResumeConfig = {
  selected_entity_ids: [],
  ai_rankings: [],
  profile_text: '',
}

export async function listJobs(): Promise<JobOffer[]> {
  const dir = path.join(DATA_DIR, 'jobs')
  try {
    const entries = await fs.readdir(dir)
    const results = await Promise.all(
      entries
        .filter((e) => !e.startsWith('.'))
        .map((id) => readJsonSafe<JobOffer>(path.join(dir, id, 'offer.json'), JobOfferSchema))
    )
    return results.filter((r): r is JobOffer => r !== null)
  } catch {
    return []
  }
}

export async function getJob(id: string): Promise<JobWithConfig | null> {
  const offer = await readJsonSafe<JobOffer>(path.join(jobDir(id), 'offer.json'), JobOfferSchema)
  if (!offer) return null
  const resume_config =
    (await readJsonSafe<ResumeConfig>(path.join(jobDir(id), 'resume-config.json'), ResumeConfigSchema)) ??
    DEFAULT_RESUME_CONFIG
  return { ...offer, resume_config }
}

export async function createJob(
  data: Omit<JobOffer, 'id' | 'date_added'>
): Promise<JobOffer> {
  const id = `job-${uuidv4().slice(0, 8)}`
  const job: JobOffer = { id, date_added: new Date().toISOString(), ...data }
  const dir = jobDir(id)
  await fs.mkdir(dir, { recursive: true })
  await fs.mkdir(path.join(dir, 'generated'), { recursive: true })
  await fs.writeFile(path.join(dir, 'offer.json'), JSON.stringify(job, null, 2))
  await fs.writeFile(
    path.join(dir, 'resume-config.json'),
    JSON.stringify(DEFAULT_RESUME_CONFIG, null, 2)
  )
  return job
}

export async function updateJob(
  id: string,
  data: Partial<Omit<JobOffer, 'id'>>
): Promise<JobOffer | null> {
  const existing = await readJsonSafe<JobOffer>(path.join(jobDir(id), 'offer.json'), JobOfferSchema)
  if (!existing) return null
  const updated = { ...existing, ...data } as JobOffer
  await fs.writeFile(path.join(jobDir(id), 'offer.json'), JSON.stringify(updated, null, 2))
  return updated
}

export async function deleteJob(id: string): Promise<boolean> {
  try {
    await fs.rm(jobDir(id), { recursive: true, force: true })
    return true
  } catch {
    return false
  }
}

export async function getResumeConfig(id: string): Promise<ResumeConfig> {
  return (
    (await readJsonSafe<ResumeConfig>(path.join(jobDir(id), 'resume-config.json'), ResumeConfigSchema)) ??
    DEFAULT_RESUME_CONFIG
  )
}

export async function saveResumeConfig(id: string, config: ResumeConfig): Promise<void> {
  await fs.writeFile(
    path.join(jobDir(id), 'resume-config.json'),
    JSON.stringify(config, null, 2)
  )
}

const JobQuestionsSchema = z.array(EntityQuestionSchema)

export async function getJobQuestions(id: string): Promise<EntityQuestion[]> {
  const filePath = path.join(jobDir(id), 'questions.json')
  return (await readJsonSafe<EntityQuestion[]>(filePath, JobQuestionsSchema)) ?? []
}

export async function saveJobQuestions(id: string, questions: EntityQuestion[]): Promise<void> {
  await fs.writeFile(
    path.join(jobDir(id), 'questions.json'),
    JSON.stringify(questions, null, 2)
  )
}
