import path from 'path'
import fs from 'fs/promises'
import { v4 as uuidv4 } from 'uuid'
import type { Exercise, ExerciseMeta } from '@/types'
import { ExerciseMetaSchema } from '@/schemas'
import { readJsonSafe, readFileSafe } from './_utils'

const DATA_DIR = path.join(process.cwd(), 'data')

function exerciseDir(id: string): string {
  return path.join(DATA_DIR, 'coding', 'exercises', id)
}

export async function listExercises(): Promise<ExerciseMeta[]> {
  const dir = path.join(DATA_DIR, 'coding', 'exercises')
  try {
    const entries = await fs.readdir(dir)
    const results = await Promise.all(
      entries
        .filter((e) => !e.startsWith('.'))
        .map((id) => readJsonSafe<ExerciseMeta>(path.join(dir, id, 'meta.json'), ExerciseMetaSchema))
    )
    return results.filter((r): r is ExerciseMeta => r !== null)
  } catch {
    return []
  }
}

export async function getExercise(id: string): Promise<Exercise | null> {
  const meta = await readJsonSafe<ExerciseMeta>(path.join(exerciseDir(id), 'meta.json'), ExerciseMetaSchema)
  if (!meta) return null
  const description = (await readFileSafe(path.join(exerciseDir(id), 'description.md'))) ?? ''
  const steps = (await readFileSafe(path.join(exerciseDir(id), 'solution', 'steps.md'))) ?? ''
  const code = (await readFileSafe(path.join(exerciseDir(id), 'solution', 'code.py'))) ?? ''
  return { ...meta, description, solution: { steps, code } } as Exercise
}

export async function createExercise(
  data: Omit<ExerciseMeta, 'id'> & { description: string; steps: string; code: string }
): Promise<ExerciseMeta> {
  const id = `ex-${uuidv4().slice(0, 8)}`
  const meta: ExerciseMeta = {
    id,
    title: data.title,
    difficulty: data.difficulty,
    knowledge_ids: data.knowledge_ids,
    tags: data.tags ?? [],
  }
  const dir = exerciseDir(id)
  await fs.mkdir(path.join(dir, 'solution'), { recursive: true })
  await fs.writeFile(path.join(dir, 'meta.json'), JSON.stringify(meta, null, 2))
  await fs.writeFile(path.join(dir, 'description.md'), data.description)
  await fs.writeFile(path.join(dir, 'solution', 'steps.md'), data.steps)
  await fs.writeFile(path.join(dir, 'solution', 'code.py'), data.code)
  return meta
}

export async function updateExercise(
  id: string,
  data: Partial<Omit<ExerciseMeta, 'id'> & { description: string; steps: string; code: string }>
): Promise<ExerciseMeta | null> {
  const existing = await readJsonSafe<ExerciseMeta>(
    path.join(exerciseDir(id), 'meta.json'),
    ExerciseMetaSchema
  )
  if (!existing) return null
  const { description, steps, code, ...metaUpdate } = data
  const updated = { ...existing, ...metaUpdate } as ExerciseMeta
  await fs.writeFile(path.join(exerciseDir(id), 'meta.json'), JSON.stringify(updated, null, 2))
  if (description !== undefined)
    await fs.writeFile(path.join(exerciseDir(id), 'description.md'), description)
  if (steps !== undefined)
    await fs.writeFile(path.join(exerciseDir(id), 'solution', 'steps.md'), steps)
  if (code !== undefined)
    await fs.writeFile(path.join(exerciseDir(id), 'solution', 'code.py'), code)
  return updated
}

export async function deleteExercise(id: string): Promise<boolean> {
  try {
    await fs.rm(exerciseDir(id), { recursive: true, force: true })
    return true
  } catch {
    return false
  }
}
