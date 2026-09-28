import path from 'path'
import fs from 'fs/promises'
import { v4 as uuidv4 } from 'uuid'
import type { KnowledgeItem, KnowledgeMeta } from '@/types'
import { KnowledgeMetaSchema } from '@/schemas'
import { readJsonSafe, readFileSafe } from './_utils'

const DATA_DIR = path.join(process.cwd(), 'data')

function knowledgeDir(id: string): string {
  return path.join(DATA_DIR, 'coding', 'knowledge', id)
}

export async function listKnowledge(): Promise<KnowledgeMeta[]> {
  const dir = path.join(DATA_DIR, 'coding', 'knowledge')
  try {
    const entries = await fs.readdir(dir)
    const results = await Promise.all(
      entries
        .filter((e) => !e.startsWith('.'))
        .map((id) => readJsonSafe<KnowledgeMeta>(path.join(dir, id, 'meta.json'), KnowledgeMetaSchema))
    )
    return results.filter((r): r is KnowledgeMeta => r !== null)
  } catch {
    return []
  }
}

export async function getKnowledge(id: string): Promise<KnowledgeItem | null> {
  const meta = await readJsonSafe<KnowledgeMeta>(path.join(knowledgeDir(id), 'meta.json'), KnowledgeMetaSchema)
  if (!meta) return null
  const explanation = (await readFileSafe(path.join(knowledgeDir(id), 'explanation.md'))) ?? ''
  return { ...meta, explanation } as KnowledgeItem
}

export async function createKnowledge(
  data: Omit<KnowledgeMeta, 'id'> & { explanation: string }
): Promise<KnowledgeMeta> {
  const id = `k-${uuidv4().slice(0, 8)}`
  const meta: KnowledgeMeta = { id, name: data.name, category: data.category, tags: data.tags ?? [] }
  const dir = knowledgeDir(id)
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(path.join(dir, 'meta.json'), JSON.stringify(meta, null, 2))
  await fs.writeFile(path.join(dir, 'explanation.md'), data.explanation)
  return meta
}

export async function updateKnowledge(
  id: string,
  data: Partial<Omit<KnowledgeMeta, 'id'> & { explanation: string }>
): Promise<KnowledgeMeta | null> {
  const existing = await readJsonSafe<KnowledgeMeta>(
    path.join(knowledgeDir(id), 'meta.json'),
    KnowledgeMetaSchema
  )
  if (!existing) return null
  const { explanation, ...metaUpdate } = data
  const updated = { ...existing, ...metaUpdate } as KnowledgeMeta
  await fs.writeFile(path.join(knowledgeDir(id), 'meta.json'), JSON.stringify(updated, null, 2))
  if (explanation !== undefined)
    await fs.writeFile(path.join(knowledgeDir(id), 'explanation.md'), explanation)
  return updated
}

export async function deleteKnowledge(id: string): Promise<boolean> {
  try {
    await fs.rm(knowledgeDir(id), { recursive: true, force: true })
    return true
  } catch {
    return false
  }
}
