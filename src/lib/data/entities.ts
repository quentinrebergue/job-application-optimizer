import { v4 as uuidv4 } from 'uuid'
import type { EntityType, EntityMeta } from '@/types'
import { pool } from '@/lib/db'

interface EntityRow {
  id: string
  type: EntityType
  tags: string[]
  latex_snippet: string
  data: Record<string, unknown>
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

export async function listEntities(userId: string, type: EntityType): Promise<EntityMeta[]> {
  const { rows } = await pool.query(
    'SELECT * FROM entities WHERE user_id = $1 AND type = $2 ORDER BY id',
    [userId, type]
  )
  return rows.map(rowToEntityMeta)
}

export async function getEntity(userId: string, type: EntityType, id: string): Promise<EntityMeta | null> {
  const { rows } = await pool.query(
    'SELECT * FROM entities WHERE user_id = $1 AND type = $2 AND id = $3',
    [userId, type, id]
  )
  if (rows.length === 0) return null
  return rowToEntityMeta(rows[0])
}

export async function createEntity(
  userId: string,
  type: EntityType,
  data: Omit<EntityMeta, 'id' | 'type'>
): Promise<EntityMeta> {
  const id = `${type.slice(0, 4)}-${uuidv4().slice(0, 8)}`
  const { tags, latex_snippet, ...rest } = data
  const { rows } = await pool.query(
    `INSERT INTO entities (id, user_id, type, tags, latex_snippet, data)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [id, userId, type, tags ?? [], latex_snippet ?? '', JSON.stringify(rest)]
  )
  return rowToEntityMeta(rows[0])
}

export async function updateEntity(
  userId: string,
  type: EntityType,
  id: string,
  data: Partial<Omit<EntityMeta, 'id' | 'type'>>
): Promise<EntityMeta | null> {
  const existing = await pool.query(
    'SELECT * FROM entities WHERE user_id=$1 AND type=$2 AND id=$3',
    [userId, type, id]
  )
  if (existing.rows.length === 0) return null
  const merged = { ...rowToEntityMeta(existing.rows[0]), ...data }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { tags, latex_snippet, id: _id, type: _type, ...rest } = merged
  const { rows } = await pool.query(
    `UPDATE entities SET tags=$4, latex_snippet=$5, data=$6 WHERE user_id=$1 AND type=$2 AND id=$3 RETURNING *`,
    [userId, type, id, tags ?? [], latex_snippet ?? '', JSON.stringify(rest)]
  )
  return rowToEntityMeta(rows[0])
}

export async function deleteEntity(userId: string, type: EntityType, id: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    'DELETE FROM entities WHERE user_id=$1 AND type=$2 AND id=$3',
    [userId, type, id]
  )
  return (rowCount ?? 0) > 0
}
