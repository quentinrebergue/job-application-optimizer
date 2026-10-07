import 'server-only'
import crypto from 'crypto'
import { cookies } from 'next/headers'
import { pool } from '@/lib/db'

const SESSION_COOKIE = 'session'
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

export async function createSession(userId: string): Promise<void> {
  const sessionId = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS)

  await pool.query(
    `INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, $3)`,
    [sessionId, userId, expiresAt]
  )

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  })
}

export async function getSessionUserId(): Promise<string | null> {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value
  if (!sessionId) return null

  const result = await pool.query<{ user_id: string }>(
    `SELECT user_id FROM sessions WHERE id = $1 AND expires_at > now()`,
    [sessionId]
  )
  return result.rows[0]?.user_id ?? null
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value
  if (sessionId) {
    await pool.query(`DELETE FROM sessions WHERE id = $1`, [sessionId])
  }
  cookieStore.delete(SESSION_COOKIE)
}

/** Signs the user out everywhere (after a password reset). */
export async function deleteAllSessions(userId: string): Promise<void> {
  await pool.query('DELETE FROM sessions WHERE user_id = $1', [userId])
}
