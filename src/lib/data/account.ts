import { pool } from '@/lib/db'

// What belongs to the account itself: a copy of everything the user holds, and its erasure (#104).
// Every table that points at users is `ON DELETE CASCADE` (the test of the deletion counts the rows of
// every table, so a table added without it is found there). Two tables hold the user without pointing
// at the row: login_attempts (by the email as it was typed, so any capitals) and the creation counters of rate_limits (by user id).

/** Everything the app holds about the user, as one document. */
export interface AccountExport {
  exported_at: string
  account: { email: string; created_at: string; email_verified: boolean }
  profile: Record<string, unknown> | null
  library: Array<Record<string, unknown>>
  jobs: Array<Record<string, unknown>>
  /** The calls of the AI ranking made for the user: date, feature, model, tokens, cost. */
  ai_calls: Array<Record<string, unknown>>
}

export async function exportAccount(userId: string): Promise<AccountExport | null> {
  const user = await pool.query<{ email: string; created_at: Date; email_verified_at: Date | null }>(
    'SELECT email, created_at, email_verified_at FROM users WHERE id = $1',
    [userId],
  )
  if (user.rows.length === 0) return null

  const [profile, entities, jobs, usage] = await Promise.all([
    pool.query(
      `SELECT full_name, email, linkedin, github, phone, address, resume_title, profile_text, ai_context, updated_at
       FROM user_resume_profile WHERE user_id = $1`,
      [userId],
    ),
    pool.query('SELECT id, type, tags, latex_snippet, data FROM entities WHERE user_id = $1 ORDER BY type, id', [userId]),
    pool.query(
      `SELECT id, company, title, description, location, url, status, date_added, tags, ats_tags, ai_analysis, resume_config
       FROM jobs WHERE user_id = $1 ORDER BY date_added DESC`,
      [userId],
    ),
    pool.query(
      `SELECT feature, model, status, prompt_tokens, completion_tokens, cost_eur, created_at
       FROM ai_usage WHERE user_id = $1 ORDER BY id`,
      [userId],
    ),
  ])

  const u = user.rows[0]
  return {
    exported_at: new Date().toISOString(),
    account: { email: u.email, created_at: u.created_at.toISOString(), email_verified: u.email_verified_at !== null },
    profile: profile.rows[0] ?? null,
    // An entry is its fields (kept in `data`) next to its id, type and tags, as the app shows it.
    library: entities.rows.map(({ data, ...rest }) => ({ ...rest, ...data })),
    jobs: jobs.rows,
    ai_calls: usage.rows,
  }
}

/**
 * Deletes the account and everything that points at it, in one transaction. The rows of ai_usage stay
 * without the user (their `user_id` becomes NULL): they are the accounting of the site's monthly cap.
 * Returns false when there was no such account.
 */
export async function deleteAccount(userId: string): Promise<boolean> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const found = await client.query<{ email: string }>('SELECT email FROM users WHERE id = $1 FOR UPDATE', [userId])
    if (found.rows.length === 0) {
      await client.query('ROLLBACK')
      return false
    }
    await client.query('DELETE FROM login_attempts WHERE lower(email) = lower($1)', [found.rows[0].email])
    await client.query('DELETE FROM rate_limits WHERE key LIKE $1', [`create:%:${userId}:%`])
    await client.query('DELETE FROM users WHERE id = $1', [userId])
    await client.query('COMMIT')
    return true
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    throw err
  } finally {
    client.release()
  }
}
