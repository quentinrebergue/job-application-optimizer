import { AI_USAGE_MONTHS_KEPT } from '@/config/legal'
import { deleteExpiredEmailTokens } from '@/lib/data/email-tokens'
import { pool } from '@/lib/db'

// The cleanup of what the app keeps only for a while (#213). Every kept row has a reason and an age after which it
// goes, written on the privacy page; this is what makes it true. It runs every few minutes inside the server, started
// by instrumentation.ts: nothing else to install, and a row is never kept long after its time.
//
//  - rate_limits, login_attempts: when their window is over (an address, an email typed: a few minutes to an hour);
//  - sessions: once expired;
//  - email_tokens: a day after they expire (an old link still says "used" or "expired");
//  - ai_usage: the calls of a calendar month that left the last AI_USAGE_MONTHS_KEPT months are replaced by one total
//    per model, with no identity, in ai_usage_monthly: one statement deletes them and adds them up.

export type Purged = Record<'rate_limits' | 'login_attempts' | 'sessions' | 'email_tokens' | 'ai_usage', number>

/**
 * The AI calls older than the start of the previous calendar month (UTC, like the cap) are deleted and added to
 * the totals of their month, per model, **in one statement**: the totals are by construction the sum of the rows
 * that went, whatever happens in the middle. Several passes on the same month add up. The cap never reads the
 * totals, only the rows of the current month, so they cannot make it drift.
 */
const ROLL_UP_AI_USAGE = `
  WITH gone AS (
    DELETE FROM ai_usage
    WHERE created_at < (date_trunc('month', $1::timestamptz AT TIME ZONE 'UTC') - make_interval(months => $2::int)) AT TIME ZONE 'UTC'
    RETURNING created_at, coalesce(model, 'unknown') AS model, prompt_tokens, completion_tokens, cost_eur
  ), summed AS (
    SELECT date_trunc('month', created_at AT TIME ZONE 'UTC')::date AS month, model,
           count(*)::int AS calls, sum(prompt_tokens) AS prompt_tokens, sum(completion_tokens) AS completion_tokens, sum(cost_eur) AS cost_eur
    FROM gone GROUP BY 1, 2
  ), added AS (
    INSERT INTO ai_usage_monthly (month, model, calls, prompt_tokens, completion_tokens, cost_eur)
    SELECT month, model, calls, prompt_tokens, completion_tokens, cost_eur FROM summed
    ON CONFLICT (month, model) DO UPDATE SET
      calls = ai_usage_monthly.calls + EXCLUDED.calls,
      prompt_tokens = ai_usage_monthly.prompt_tokens + EXCLUDED.prompt_tokens,
      completion_tokens = ai_usage_monthly.completion_tokens + EXCLUDED.completion_tokens,
      cost_eur = ai_usage_monthly.cost_eur + EXCLUDED.cost_eur
    RETURNING 1
  )
  SELECT (SELECT count(*) FROM gone)::int AS deleted, (SELECT count(*) FROM added)::int AS months`

export async function purgeExpiredData(now = new Date()): Promise<Purged> {
  const deleted = async (sql: string, params: unknown[]) => (await pool.query(sql, params)).rowCount ?? 0
  return {
    rate_limits: await deleted('DELETE FROM rate_limits WHERE reset_at <= $1', [now]),
    login_attempts: await deleted('DELETE FROM login_attempts WHERE reset_at <= $1', [now]),
    sessions: await deleted('DELETE FROM sessions WHERE expires_at <= $1', [now]),
    email_tokens: await deleteExpiredEmailTokens(),
    ai_usage: Number((await pool.query<{ deleted: number }>(ROLL_UP_AI_USAGE, [now, AI_USAGE_MONTHS_KEPT - 1])).rows[0]?.deleted ?? 0),
  }
}

const EVERY_MS = 10 * 60 * 1000
const FIRST_AFTER_MS = 60 * 1000

declare global {
  var __maintenanceTimers: ReturnType<typeof setInterval>[] | undefined
}

/**
 * Starts the cleanup: a first pass a minute after the server starts, then every ten minutes. Safe to call twice
 * (a hot reload in development): there is one timer. A failure is logged and the next pass tries again.
 */
export function startMaintenance({ everyMs = EVERY_MS, firstAfterMs = FIRST_AFTER_MS } = {}): void {
  if (globalThis.__maintenanceTimers) return
  const pass = async () => {
    try {
      const purged = await purgeExpiredData()
      if (Object.values(purged).some((n) => n > 0)) console.info('maintenance: expired data deleted', purged)
    } catch (err) {
      console.error('maintenance: the cleanup failed', err)
    }
  }
  const first = setTimeout(pass, firstAfterMs)
  const every = setInterval(pass, everyMs)
  // Neither keeps the process alive: a server that stops is not held by its cleanup.
  first.unref()
  every.unref()
  globalThis.__maintenanceTimers = [every]
}

/** Test only: stops the timers so that a test can start them again. */
export function stopMaintenance(): void {
  for (const timer of globalThis.__maintenanceTimers ?? []) clearInterval(timer)
  globalThis.__maintenanceTimers = undefined
}
