import { v4 as uuidv4 } from 'uuid'
import type { EntityType, EntityMeta, Entity, EntityQuestion } from '@/types'
import { pool } from '@/lib/db'

interface EntityRow {
  id: string
  type: EntityType
  tags: string[]
  latex_snippet: string
  data: Record<string, unknown>
  questions: EntityQuestion[] | null
}

function rowToEntityMeta(row: EntityRow): EntityMeta {
  return {
    id: row.id,
    type: row.type,
    tags: row.tags,
    latex_snippet: row.latex_snippet,
    ...row.data,
  } as EntityMeta
}

export async function listEntities(type: EntityType): Promise<EntityMeta[]> {
  const { rows } = await pool.query('SELECT * FROM entities WHERE type = $1 ORDER BY id', [type])
  return rows.map(rowToEntityMeta)
}

export async function getEntityQuestions(type: EntityType, id: string): Promise<EntityQuestion[]> {
  const { rows } = await pool.query('SELECT questions FROM entities WHERE type = $1 AND id = $2', [type, id])
  return rows[0]?.questions ?? []
}

export async function getEntity(type: EntityType, id: string): Promise<Entity | null> {
  const { rows } = await pool.query('SELECT * FROM entities WHERE type = $1 AND id = $2', [type, id])
  if (rows.length === 0) return null
  return { ...rowToEntityMeta(rows[0]), questions: rows[0].questions ?? [] } as Entity
}

export async function createEntity(
  type: EntityType,
  data: Omit<EntityMeta, 'id' | 'type'>
): Promise<EntityMeta> {
  const id = `${type.slice(0, 4)}-${uuidv4().slice(0, 8)}`
  const { tags, latex_snippet, ...rest } = data
  const { rows } = await pool.query(
    `INSERT INTO entities (id, type, tags, latex_snippet, data, questions)
     VALUES ($1,$2,$3,$4,$5,'[]') RETURNING *`,
    [id, type, tags ?? [], latex_snippet ?? '', JSON.stringify(rest)]
  )
  return rowToEntityMeta(rows[0])
}

export async function updateEntity(
  type: EntityType,
  id: string,
  data: Partial<Omit<EntityMeta, 'id' | 'type'>>
): Promise<EntityMeta | null> {
  const existing = await pool.query('SELECT * FROM entities WHERE type=$1 AND id=$2', [type, id])
  if (existing.rows.length === 0) return null
  const merged = { ...rowToEntityMeta(existing.rows[0]), ...data }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { tags, latex_snippet, id: _id, type: _type, ...rest } = merged
  const { rows } = await pool.query(
    `UPDATE entities SET tags=$3, latex_snippet=$4, data=$5 WHERE type=$1 AND id=$2 RETURNING *`,
    [type, id, tags ?? [], latex_snippet ?? '', JSON.stringify(rest)]
  )
  return rowToEntityMeta(rows[0])
}

export async function saveEntityQuestions(type: EntityType, id: string, questions: EntityQuestion[]): Promise<void> {
  await pool.query('UPDATE entities SET questions=$3 WHERE type=$1 AND id=$2', [type, id, JSON.stringify(questions)])
}

export async function deleteEntity(type: EntityType, id: string): Promise<boolean> {
  const { rowCount } = await pool.query('DELETE FROM entities WHERE type=$1 AND id=$2', [type, id])
  return (rowCount ?? 0) > 0
}
