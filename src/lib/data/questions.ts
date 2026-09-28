import path from 'path'
import fs from 'fs/promises'
import { v4 as uuidv4 } from 'uuid'
import type { GeneralQuestion } from '@/types'
import { GeneralQuestionSchema } from '@/schemas'
import { readJsonSafe } from './_utils'

const DATA_DIR = path.join(process.cwd(), 'data')
const QUESTIONS_DIR = path.join(DATA_DIR, 'general-questions')

export async function listGeneralQuestions(): Promise<GeneralQuestion[]> {
  try {
    const entries = await fs.readdir(QUESTIONS_DIR)
    const results = await Promise.all(
      entries
        .filter((e) => e.endsWith('.json') && !e.startsWith('.'))
        .map((file) => readJsonSafe<GeneralQuestion>(path.join(QUESTIONS_DIR, file), GeneralQuestionSchema))
    )
    return results.filter((r): r is GeneralQuestion => r !== null)
  } catch {
    return []
  }
}

export async function createGeneralQuestion(
  data: Omit<GeneralQuestion, 'id'>
): Promise<GeneralQuestion> {
  const id = `gq-${uuidv4().slice(0, 8)}`
  const question: GeneralQuestion = { id, ...data }
  await fs.writeFile(path.join(QUESTIONS_DIR, `${id}.json`), JSON.stringify(question, null, 2))
  return question
}

export async function updateGeneralQuestion(
  id: string,
  data: Partial<Omit<GeneralQuestion, 'id'>>
): Promise<GeneralQuestion | null> {
  const filePath = path.join(QUESTIONS_DIR, `${id}.json`)
  const existing = await readJsonSafe<GeneralQuestion>(filePath, GeneralQuestionSchema)
  if (!existing) return null
  const updated = { ...existing, ...data } as GeneralQuestion
  await fs.writeFile(filePath, JSON.stringify(updated, null, 2))
  return updated
}

export async function deleteGeneralQuestion(id: string): Promise<boolean> {
  try {
    await fs.rm(path.join(QUESTIONS_DIR, `${id}.json`))
    return true
  } catch {
    return false
  }
}
