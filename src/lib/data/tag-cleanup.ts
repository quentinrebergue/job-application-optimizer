/**
 * tag-cleanup.ts
 * When a taxonomy alias is removed or a node is deleted, call purgeTagAliases()
 * to remove those strings from every data file that stores tags.
 *
 * Covered data sources:
 *  - data/entities/{type}/{id}/meta.json
 *  - data/jobs/{id}/offer.json
 *  - data/coding/exercises/{id}/meta.json
 *  - data/coding/knowledge/{id}/meta.json
 *  - data/general-questions/*.json
 */

import fs from 'fs/promises'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data')

const ENTITY_TYPES = ['experiences', 'projects', 'skills', 'education'] as const

/** Read a directory, returning [] if it doesn't exist */
async function safeReaddir(dir: string): Promise<string[]> {
  try {
    return await fs.readdir(dir)
  } catch {
    return []
  }
}

/** Collect all file paths that contain a `tags` array across all data sources */
async function collectTaggedFiles(): Promise<string[]> {
  const files: string[] = []

  // entities
  for (const type of ENTITY_TYPES) {
    const dir = path.join(DATA_DIR, 'entities', type)
    const entries = await safeReaddir(dir)
    for (const id of entries.filter((e) => !e.startsWith('.'))) {
      files.push(path.join(dir, id, 'meta.json'))
    }
  }

  // jobs
  const jobsDir = path.join(DATA_DIR, 'jobs')
  for (const id of await safeReaddir(jobsDir)) {
    if (!id.startsWith('job-')) continue
    files.push(path.join(jobsDir, id, 'offer.json'))
  }

  // exercises
  const exercisesDir = path.join(DATA_DIR, 'coding', 'exercises')
  for (const id of await safeReaddir(exercisesDir)) {
    if (id.startsWith('.')) continue
    files.push(path.join(exercisesDir, id, 'meta.json'))
  }

  // knowledge
  const knowledgeDir = path.join(DATA_DIR, 'coding', 'knowledge')
  for (const id of await safeReaddir(knowledgeDir)) {
    if (id.startsWith('.')) continue
    files.push(path.join(knowledgeDir, id, 'meta.json'))
  }

  // general questions
  const questionsDir = path.join(DATA_DIR, 'general-questions')
  for (const file of await safeReaddir(questionsDir)) {
    if (file.endsWith('.json')) {
      files.push(path.join(questionsDir, file))
    }
  }

  return files
}

/**
 * Remove the given alias strings from the `tags` array of every data file.
 * Matching is case-insensitive. Returns the number of files that were modified.
 */
export async function purgeTagAliases(aliases: string[]): Promise<number> {
  if (aliases.length === 0) return 0
  const lowerAliases = new Set(aliases.map((a) => a.toLowerCase()))

  const files = await collectTaggedFiles()
  let updated = 0

  await Promise.all(
    files.map(async (filePath) => {
      try {
        const raw = await fs.readFile(filePath, 'utf-8')
        const data = JSON.parse(raw) as Record<string, unknown>

        if (!Array.isArray(data.tags)) return

        const before = data.tags as string[]
        const after = before.filter((t) => !lowerAliases.has(t.toLowerCase()))

        if (after.length !== before.length) {
          data.tags = after
          await fs.writeFile(filePath, JSON.stringify(data, null, 2))
          updated++
        }
      } catch {
        // Skip unreadable / non-JSON files silently
      }
    })
  )

  return updated
}
