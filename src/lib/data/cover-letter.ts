import path from 'path'
import fs from 'fs/promises'
import { v4 as uuidv4 } from 'uuid'
import type { CoverLetterSentence, JobCoverLetterConfig } from '@/types/cover-letter'
import { CoverLetterSentenceSchema, JobCoverLetterConfigSchema } from '@/schemas/cover-letter'
import { readJsonSafe } from './_utils'

const DATA_DIR = path.join(process.cwd(), 'data')
const SENTENCES_FILE = path.join(DATA_DIR, 'cover-letter', 'sentences.json')

function jobDir(id: string): string {
  return path.join(DATA_DIR, 'jobs', id)
}

const DEFAULT_JOB_COVER_LETTER: JobCoverLetterConfig = {
  selected_sentence_ids: [],
  generated_letter: '',
  ai_context: '',
}

// ─── Sentence bank ────────────────────────────────────────────────────────────

async function readSentences(): Promise<CoverLetterSentence[]> {
  try {
    const raw = await fs.readFile(SENTENCES_FILE, 'utf-8')
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((item) => CoverLetterSentenceSchema.safeParse(item))
      .filter((r) => r.success)
      .map((r) => (r as { success: true; data: CoverLetterSentence }).data)
  } catch {
    return []
  }
}

async function writeSentences(sentences: CoverLetterSentence[]): Promise<void> {
  await fs.mkdir(path.dirname(SENTENCES_FILE), { recursive: true })
  await fs.writeFile(SENTENCES_FILE, JSON.stringify(sentences, null, 2))
}

export async function listSentences(): Promise<CoverLetterSentence[]> {
  return readSentences()
}

export async function createSentence(
  data: Omit<CoverLetterSentence, 'id' | 'created_at'>
): Promise<CoverLetterSentence> {
  const sentences = await readSentences()
  const sentence: CoverLetterSentence = {
    id: `cls-${uuidv4().slice(0, 8)}`,
    created_at: new Date().toISOString(),
    ...data,
  }
  await writeSentences([...sentences, sentence])
  return sentence
}

export async function updateSentence(
  id: string,
  data: Partial<Omit<CoverLetterSentence, 'id' | 'created_at'>>
): Promise<CoverLetterSentence | null> {
  const sentences = await readSentences()
  const idx = sentences.findIndex((s) => s.id === id)
  if (idx === -1) return null
  const updated = { ...sentences[idx], ...data }
  sentences[idx] = updated
  await writeSentences(sentences)
  return updated
}

export async function deleteSentence(id: string): Promise<boolean> {
  const sentences = await readSentences()
  const filtered = sentences.filter((s) => s.id !== id)
  if (filtered.length === sentences.length) return false
  await writeSentences(filtered)
  return true
}

// ─── Per-job cover letter config ──────────────────────────────────────────────

export async function getJobCoverLetter(jobId: string): Promise<JobCoverLetterConfig> {
  return (
    (await readJsonSafe<JobCoverLetterConfig>(
      path.join(jobDir(jobId), 'cover-letter.json'),
      JobCoverLetterConfigSchema
    )) ?? DEFAULT_JOB_COVER_LETTER
  )
}

export async function saveJobCoverLetter(
  jobId: string,
  config: JobCoverLetterConfig
): Promise<void> {
  await fs.writeFile(
    path.join(jobDir(jobId), 'cover-letter.json'),
    JSON.stringify(config, null, 2)
  )
}
