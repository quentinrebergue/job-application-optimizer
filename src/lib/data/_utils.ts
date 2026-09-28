import fs from 'fs/promises'
import { z } from 'zod'

export async function readJsonSafe<T>(
  filePath: string,
  schema: z.ZodTypeAny
): Promise<T | null> {
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    const parsed = JSON.parse(raw) as unknown
    const result = schema.safeParse(parsed)
    if (result.success) return result.data as T
    console.warn(`[data] Invalid JSON at ${filePath}:`, result.error.issues)
    return null
  } catch {
    return null
  }
}

export async function readFileSafe(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, 'utf-8')
  } catch {
    return null
  }
}
