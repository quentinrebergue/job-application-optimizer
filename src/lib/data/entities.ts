import path from 'path'
import fs from 'fs/promises'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import type { EntityType, EntityMeta, Entity, EntityQuestion } from '@/types'
import { EntityMetaSchema, EntityQuestionSchema } from '@/schemas'
import { readJsonSafe } from './_utils'

const DATA_DIR = path.join(process.cwd(), 'data')

function entityDir(type: EntityType, id: string): string {
  return path.join(DATA_DIR, 'entities', type, id)
}

function entityTypeDir(type: EntityType): string {
  return path.join(DATA_DIR, 'entities', type)
}

export async function listEntities(type: EntityType): Promise<EntityMeta[]> {
  const dir = entityTypeDir(type)
  try {
    const entries = await fs.readdir(dir)
    const results = await Promise.all(
      entries
        .filter((e) => !e.startsWith('.'))
        .map((id) => readJsonSafe<EntityMeta>(path.join(dir, id, 'meta.json'), EntityMetaSchema))
    )
    return results.filter((r): r is EntityMeta => r !== null)
  } catch {
    return []
  }
}

export async function getEntityQuestions(
  type: EntityType,
  id: string
): Promise<EntityQuestion[]> {
  const filePath = path.join(entityDir(type, id), 'questions.json')
  const schema = z.array(EntityQuestionSchema)
  return (await readJsonSafe<EntityQuestion[]>(filePath, schema)) ?? []
}

export async function getEntity(type: EntityType, id: string): Promise<Entity | null> {
  const meta = await readJsonSafe<EntityMeta>(path.join(entityDir(type, id), 'meta.json'), EntityMetaSchema)
  if (!meta) return null
  const questions = await getEntityQuestions(type, id)
  return { ...meta, questions } as Entity
}

export async function createEntity(
  type: EntityType,
  data: Omit<EntityMeta, 'id' | 'type'>
): Promise<EntityMeta> {
  const id = `${type.slice(0, 4)}-${uuidv4().slice(0, 8)}`
  const meta = { id, type, ...data } as EntityMeta
  const dir = entityDir(type, id)
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(path.join(dir, 'meta.json'), JSON.stringify(meta, null, 2))
  await fs.writeFile(path.join(dir, 'questions.json'), JSON.stringify([], null, 2))
  return meta
}

export async function updateEntity(
  type: EntityType,
  id: string,
  data: Partial<Omit<EntityMeta, 'id' | 'type'>>
): Promise<EntityMeta | null> {
  const existing = await readJsonSafe<EntityMeta>(path.join(entityDir(type, id), 'meta.json'), EntityMetaSchema)
  if (!existing) return null
  const updated = { ...existing, ...data } as EntityMeta
  await fs.writeFile(path.join(entityDir(type, id), 'meta.json'), JSON.stringify(updated, null, 2))
  return updated
}

export async function saveEntityQuestions(
  type: EntityType,
  id: string,
  questions: EntityQuestion[]
): Promise<void> {
  await fs.writeFile(
    path.join(entityDir(type, id), 'questions.json'),
    JSON.stringify(questions, null, 2)
  )
}

export async function deleteEntity(type: EntityType, id: string): Promise<boolean> {
  try {
    await fs.rm(entityDir(type, id), { recursive: true, force: true })
    return true
  } catch {
    return false
  }
}
