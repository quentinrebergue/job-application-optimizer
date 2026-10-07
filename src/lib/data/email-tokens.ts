import crypto from 'crypto'
import { pool } from '@/lib/db'

export type TokenPurpose = 'verify' | 'reset'

/** Why a link was refused: unknown (or for another purpose), already used, or too old. */
export type TokenFailure = 'invalid' | 'used' | 'expired'

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

/** Creates a single-use token; returns the raw value, which only goes into the mail. */
export async function createEmailToken(userId: string, purpose: TokenPurpose, ttlMs: number): Promise<string> {
  const token = crypto.randomBytes(32).toString('base64url')
  await pool.query(
    'INSERT INTO email_tokens (token_hash, user_id, purpose, expires_at) VALUES ($1, $2, $3, $4)',
    [hashToken(token), userId, purpose, new Date(Date.now() + ttlMs)],
  )
  return token
}

/**
 * Uses a token: marks it used and returns its user, in one statement so the
 * same link cannot be used twice, even by two requests at once.
 */
export async function consumeEmailToken(
  token: string,
  purpose: TokenPurpose,
): Promise<{ userId: string } | { failure: TokenFailure }> {
  const hash = hashToken(token)
  const { rows } = await pool.query<{ user_id: string }>(
    `UPDATE email_tokens SET used_at = now()
     WHERE token_hash = $1 AND purpose = $2 AND used_at IS NULL AND expires_at > now()
     RETURNING user_id`,
    [hash, purpose],
  )
  if (rows[0]) return { userId: rows[0].user_id }
  return { failure: await whyRefused(hash, purpose) }
}

/** Why a token that cannot be used was refused. */
async function whyRefused(hash: string, purpose: TokenPurpose): Promise<TokenFailure> {
  const { rows } = await pool.query<{ used_at: Date | null }>(
    'SELECT used_at FROM email_tokens WHERE token_hash = $1 AND purpose = $2',
    [hash, purpose],
  )
  if (!rows[0]) return 'invalid'
  return rows[0].used_at ? 'used' : 'expired'
}

/**
 * Checks a token without using it: the reset page opens the form only for a
 * valid link, and the link survives mail scanners that open it first.
 */
export async function peekEmailToken(
  token: string,
  purpose: TokenPurpose,
): Promise<{ userId: string } | { failure: TokenFailure }> {
  const hash = hashToken(token)
  const { rows } = await pool.query<{ user_id: string }>(
    `SELECT user_id FROM email_tokens
     WHERE token_hash = $1 AND purpose = $2 AND used_at IS NULL AND expires_at > now()`,
    [hash, purpose],
  )
  if (rows[0]) return { userId: rows[0].user_id }
  return { failure: await whyRefused(hash, purpose) }
}

/** Marks every unused token of this purpose as used (older links stop working). */
export async function invalidateEmailTokens(userId: string, purpose: TokenPurpose): Promise<void> {
  await pool.query(
    'UPDATE email_tokens SET used_at = now() WHERE user_id = $1 AND purpose = $2 AND used_at IS NULL',
    [userId, purpose],
  )
}

/** Tokens of this purpose created for the user since `since` (to limit resends). */
export async function countRecentTokens(
  userId: string,
  purpose: TokenPurpose,
  since: Date,
): Promise<{ count: number; latest: Date | null }> {
  const { rows } = await pool.query<{ count: string; latest: Date | null }>(
    `SELECT count(*) AS count, max(created_at) AS latest FROM email_tokens
     WHERE user_id = $1 AND purpose = $2 AND created_at > $3`,
    [userId, purpose, since],
  )
  return { count: Number(rows[0]?.count ?? 0), latest: rows[0]?.latest ?? null }
}
