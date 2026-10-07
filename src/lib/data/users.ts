import { pool } from '@/lib/db'
import { hashPassword } from '@/lib/auth/password'

export interface User {
  id: string
  email: string
  createdAt: string
  /** False until the user opens the link of the confirmation mail */
  emailVerified: boolean
}

interface UserRow {
  id: string
  email: string
  password_hash: string
  created_at: Date
  email_verified_at: Date | null
}

function rowToUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    createdAt: row.created_at.toISOString(),
    emailVerified: row.email_verified_at !== null,
  }
}

export async function createUser(email: string, password: string): Promise<User> {
  const passwordHash = await hashPassword(password)
  const result = await pool.query<UserRow>(
    `INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING *`,
    [email.toLowerCase().trim(), passwordHash]
  )
  return rowToUser(result.rows[0])
}

export async function findUserByEmail(email: string): Promise<(User & { passwordHash: string }) | null> {
  const result = await pool.query<UserRow>(
    `SELECT * FROM users WHERE email = $1`,
    [email.toLowerCase().trim()]
  )
  const row = result.rows[0]
  if (!row) return null
  return { ...rowToUser(row), passwordHash: row.password_hash }
}

export async function findUserById(id: string): Promise<User | null> {
  const result = await pool.query<UserRow>(
    `SELECT * FROM users WHERE id = $1`,
    [id]
  )
  const row = result.rows[0]
  return row ? rowToUser(row) : null
}

/** Marks the address as confirmed (keeps the first confirmation date). */
export async function markEmailVerified(id: string): Promise<void> {
  await pool.query(
    'UPDATE users SET email_verified_at = now() WHERE id = $1 AND email_verified_at IS NULL',
    [id]
  )
}

/** Sets a new password (hashed like at sign-up). */
export async function updatePassword(id: string, password: string): Promise<void> {
  const passwordHash = await hashPassword(password)
  await pool.query('UPDATE users SET password_hash = $2 WHERE id = $1', [id, passwordHash])
}
