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

/**
 * Sets a new password and, in the same transaction, closes every session of the user and cancels the
 * reset and change-of-address links not yet used. One step: a failure in the middle cannot leave the
 * old sessions (an attacker's, perhaps) open under the new password, or a pending change of address
 * alive after the owner changed the password to cut it.
 */
export async function replacePassword(id: string, password: string): Promise<void> {
  const passwordHash = await hashPassword(password)
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('UPDATE users SET password_hash = $2 WHERE id = $1', [id, passwordHash])
    await client.query('DELETE FROM sessions WHERE user_id = $1', [id])
    await client.query(
      `UPDATE email_tokens SET used_at = now()
       WHERE user_id = $1 AND purpose IN ('reset', 'change-email') AND used_at IS NULL`,
      [id],
    )
    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    throw err
  } finally {
    client.release()
  }
}

/** The hash of the password of this account, to check it before a sensitive action. */
export async function findPasswordHash(id: string): Promise<string | null> {
  const result = await pool.query<{ password_hash: string }>('SELECT password_hash FROM users WHERE id = $1', [id])
  return result.rows[0]?.password_hash ?? null
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

/**
 * Gives the account a new address, already confirmed (the link was opened there). False when another
 * account has it, which the unique index decides at this very moment, not a check made earlier.
 */
export async function updateEmail(id: string, email: string): Promise<boolean> {
  try {
    await pool.query('UPDATE users SET email = $2, email_verified_at = now() WHERE id = $1', [id, email.toLowerCase().trim()])
    return true
  } catch (err) {
    if (err instanceof Error && 'code' in err && err.code === '23505') return false
    throw err
  }
}

/** Whether an account has this address. */
export async function emailTaken(email: string): Promise<boolean> {
  const { rows } = await pool.query('SELECT 1 FROM users WHERE email = $1', [email.toLowerCase().trim()])
  return rows.length > 0
}
