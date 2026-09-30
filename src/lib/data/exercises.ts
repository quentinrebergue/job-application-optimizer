import { v4 as uuidv4 } from 'uuid'
import type { Exercise, ExerciseMeta } from '@/types'
import { pool } from '@/lib/db'

interface ExerciseRow {
  id: string
  title: string
  difficulty: ExerciseMeta['difficulty']
  knowledge_ids: string[]
  tags: string[]
  category: string | null
  leetcode: number | null
  pattern_justifications: ExerciseMeta['patternJustifications'] | null
  description?: string | null
  steps?: string | null
  code?: string | null
}

function rowToMeta(row: ExerciseRow): ExerciseMeta {
  return {
    id: row.id,
    title: row.title,
    difficulty: row.difficulty,
    knowledge_ids: row.knowledge_ids,
    tags: row.tags,
    category: row.category ?? undefined,
    leetcode: row.leetcode ?? undefined,
    patternJustifications: row.pattern_justifications ?? undefined,
  }
}

export async function listExercises(): Promise<ExerciseMeta[]> {
  const { rows } = await pool.query('SELECT * FROM exercises ORDER BY id')
  return rows.map(rowToMeta)
}

export async function getExercise(id: string): Promise<Exercise | null> {
  const { rows } = await pool.query('SELECT * FROM exercises WHERE id = $1', [id])
  if (rows.length === 0) return null
  const row = rows[0]
  return {
    ...rowToMeta(row),
    description: row.description ?? '',
    solution: { steps: row.steps ?? '', code: row.code ?? '' },
  } as Exercise
}

export async function createExercise(
  data: Omit<ExerciseMeta, 'id'> & { description: string; steps: string; code: string }
): Promise<ExerciseMeta> {
  const id = `ex-${uuidv4().slice(0, 8)}`
  const { rows } = await pool.query(
    `INSERT INTO exercises (id, title, difficulty, knowledge_ids, tags, category, leetcode, pattern_justifications, description, steps, code)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [
      id, data.title, data.difficulty, data.knowledge_ids ?? [], data.tags ?? [],
      data.category ?? null, data.leetcode ?? null,
      data.patternJustifications ? JSON.stringify(data.patternJustifications) : null,
      data.description, data.steps, data.code,
    ]
  )
  return rowToMeta(rows[0])
}

export async function updateExercise(
  id: string,
  data: Partial<Omit<ExerciseMeta, 'id'> & { description: string; steps: string; code: string }>
): Promise<ExerciseMeta | null> {
  const existing = await pool.query('SELECT * FROM exercises WHERE id = $1', [id])
  if (existing.rows.length === 0) return null
  const row = existing.rows[0]
  const merged = {
    title: data.title ?? row.title,
    difficulty: data.difficulty ?? row.difficulty,
    knowledge_ids: data.knowledge_ids ?? row.knowledge_ids,
    tags: data.tags ?? row.tags,
    category: data.category ?? row.category,
    leetcode: data.leetcode ?? row.leetcode,
    patternJustifications: data.patternJustifications ?? row.pattern_justifications,
    description: data.description ?? row.description,
    steps: data.steps ?? row.steps,
    code: data.code ?? row.code,
  }
  const { rows } = await pool.query(
    `UPDATE exercises SET title=$2, difficulty=$3, knowledge_ids=$4, tags=$5, category=$6,
     leetcode=$7, pattern_justifications=$8, description=$9, steps=$10, code=$11
     WHERE id=$1 RETURNING *`,
    [
      id, merged.title, merged.difficulty, merged.knowledge_ids, merged.tags,
      merged.category ?? null, merged.leetcode ?? null,
      merged.patternJustifications ? JSON.stringify(merged.patternJustifications) : null,
      merged.description, merged.steps, merged.code,
    ]
  )
  return rowToMeta(rows[0])
}

export async function deleteExercise(id: string): Promise<boolean> {
  const { rowCount } = await pool.query('DELETE FROM exercises WHERE id = $1', [id])
  return (rowCount ?? 0) > 0
}
