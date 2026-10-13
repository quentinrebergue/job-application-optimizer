import { pool } from '@/lib/db'
import { waitFor } from '@/lib/quotas'
import { aiLimits } from './limits'
import { CHARS_PER_TOKEN_FLOOR, DEAREST_PRICE, costOf, priceOf } from './prices'

// The accounting of the AI (#203): every call is written to ai_usage before it is made and
// settled after it. The limits are checked on what is written there:
//  - per user, calls in a rolling hour, day and week (a failed call counts: a loop of failures
//    is stopped too);
//  - for the whole site, the euros spent since the start of the month (UTC), pending calls
//    included at their worst-case cost, so calls made at the same time cannot all slip under it.
// The check and the write are one transaction under a lock: they cannot interleave.

const HOUR_MS = 3_600_000
const DAY_MS = 24 * HOUR_MS
const WEEK_MS = 7 * DAY_MS

/** Any number: the transactions of two requests wait for each other on it. */
const LOCK_ID = 20203

export type Denial = {
  denied: true
  /** 429 for a user's limit, 503 for the site's cap: the AI is paused for everyone. */
  status: 429 | 503
  code: 'ai_user_limit' | 'ai_monthly_cap'
  /** What the user reads. */
  message: string
  retryAfterSeconds?: number
}
/** `model` is the one the reservation was priced with (the settlement of a timeout uses it too). */
export type Reservation = { denied?: false; id: number; model?: string }

/**
 * What a call costs at most, before it is made: the biggest prompt and answer (an import's answer may be longer). At the price of the
 * model that answered last (the gateway does not say which one it will use), or the dearest known
 * price when no call has been made yet or the model is not in the table.
 */
export function worstCaseCost(model?: string, feature?: string): number {
  const limits = aiLimits()
  const outputTokens = feature === 'import' ? limits.maxOutputTokensImport : limits.maxOutputTokens
  const price = priceOf(model) ?? DEAREST_PRICE
  const input = (limits.maxPromptChars / CHARS_PER_TOKEN_FLOOR) * price.input
  return (input + outputTokens * price.output) / 1e6
}

/** What a call that timed out costs: its prompt, which the provider may have billed, and no answer. */
export function timeoutCost(model?: string): number {
  const { maxPromptChars } = aiLimits()
  const price = priceOf(model) ?? DEAREST_PRICE
  return ((maxPromptChars / CHARS_PER_TOKEN_FLOOR) * price.input) / 1e6
}

const startOfMonth = (now: Date) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
const startOfNextMonth = (now: Date) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))

/**
 * Checks the limits and, if the call may go ahead, writes it as reserved. Call it just before
 * the AI and settle it after, whatever happens.
 */
export async function reserveAiCall(userId: string, feature: string, now = new Date()): Promise<Reservation | Denial> {
  const limits = aiLimits()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('SELECT pg_advisory_xact_lock($1)', [LOCK_ID])

    // Priced like the model that answered last: change the gateway's model and the reservations follow.
    const last = await client.query<{ model: string }>(
      "SELECT model FROM ai_usage WHERE status = 'done' AND model IS NOT NULL ORDER BY id DESC LIMIT 1",
    )
    const model = last.rows[0]?.model
    const reserved = worstCaseCost(model, feature)

    const spent = await client.query<{ eur: string }>(
      'SELECT coalesce(sum(cost_eur), 0) AS eur FROM ai_usage WHERE created_at >= $1',
      [startOfMonth(now)],
    )
    if (Number(spent.rows[0].eur) + reserved > limits.monthlyCapEur) {
      await client.query('ROLLBACK')
      console.warn('AI monthly cap reached', { spent: Number(spent.rows[0].eur), cap: limits.monthlyCapEur })
      return {
        denied: true, status: 503, code: 'ai_monthly_cap',
        message: 'The AI is paused until next month.',
        retryAfterSeconds: Math.ceil((startOfNextMonth(now).getTime() - now.getTime()) / 1000),
      }
    }

    const mine = await client.query<{ created_at: Date }>(
      'SELECT created_at FROM ai_usage WHERE user_id = $1 AND created_at > $2 ORDER BY created_at',
      [userId, new Date(now.getTime() - WEEK_MS)],
    )
    const times = mine.rows.map((r) => r.created_at.getTime())
    const windows = [
      { name: 'hour', ms: HOUR_MS, limit: limits.perHour },
      { name: 'day', ms: DAY_MS, limit: limits.perDay },
      { name: 'week', ms: WEEK_MS, limit: limits.perWeek },
    ]
    // Every window over its limit says when its oldest call leaves it: the user waits for the longest.
    let worst: { name: string; limit: number; waitMs: number } | null = null
    for (const { name, ms, limit } of windows) {
      const inside = times.filter((t) => t > now.getTime() - ms)
      if (inside.length < limit) continue
      const waitMs = inside[inside.length - limit] + ms - now.getTime()
      if (!worst || waitMs > worst.waitMs) worst = { name, limit, waitMs }
    }
    if (worst) {
      await client.query('ROLLBACK')
      console.warn('AI user limit reached', { userId, window: worst.name, limit: worst.limit })
      return {
        denied: true, status: 429, code: 'ai_user_limit',
        message: `You have used the AI ${worst.limit} times this ${worst.name}. Try again in ${waitFor(worst.waitMs)}.`,
        retryAfterSeconds: Math.ceil(worst.waitMs / 1000),
      }
    }

    const inserted = await client.query<{ id: string }>(
      `INSERT INTO ai_usage (user_id, feature, status, cost_eur, created_at)
       VALUES ($1, $2, 'reserved', $3, $4) RETURNING id`,
      [userId, feature, reserved, now],
    )
    await client.query('COMMIT')
    return { id: Number(inserted.rows[0].id), model }
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  } finally {
    client.release()
  }
}

export type Outcome =
  | { status: 'done'; model: string | undefined; promptTokens: number; completionTokens: number }
  | { status: 'failed'; timedOut: boolean }
  /** The call never reached the AI (the kill switch): it is not counted, for the user or the site. */
  | { status: 'released' }

/** Writes what the call really was over its reservation. Never throws: the user's answer matters more. */
export async function settleAiCall(reservation: Reservation, outcome: Outcome, now = new Date()): Promise<void> {
  try {
    const limits = aiLimits()
    if (outcome.status === 'released') {
      await pool.query('DELETE FROM ai_usage WHERE id = $1', [reservation.id])
      return
    }
    if (outcome.status === 'failed') {
      await pool.query('UPDATE ai_usage SET status = $2, cost_eur = $3 WHERE id = $1', [
        reservation.id, 'failed', outcome.timedOut ? timeoutCost(reservation.model) : 0,
      ])
      return
    }
    let cost = costOf(outcome.model, outcome.promptTokens, outcome.completionTokens)
    if (cost === null) {
      // A model with no price in the table: take it at the dearest price rather than at none.
      console.warn('AI call of a model without a price, counted at the dearest one', { model: outcome.model })
      cost = (outcome.promptTokens * DEAREST_PRICE.input + outcome.completionTokens * DEAREST_PRICE.output) / 1e6
    }
    await pool.query(
      `UPDATE ai_usage SET status = 'done', model = $2, prompt_tokens = $3, completion_tokens = $4, cost_eur = $5 WHERE id = $1`,
      [reservation.id, outcome.model ?? null, outcome.promptTokens, outcome.completionTokens, cost],
    )

    // The warning: said once, when this call takes the month's spending over its share of the cap.
    const { rows } = await pool.query<{ eur: string }>(
      'SELECT coalesce(sum(cost_eur), 0) AS eur FROM ai_usage WHERE created_at >= $1',
      [startOfMonth(now)],
    )
    const total = Number(rows[0].eur)
    const threshold = limits.monthlyCapEur * limits.warnAt
    if (total >= threshold && total - cost < threshold) {
      console.warn(`AI spending reached ${Math.round(limits.warnAt * 100)}% of the monthly cap`, { spent: total, cap: limits.monthlyCapEur })
    }
  } catch (error) {
    console.error('could not settle an AI call', reservation.id, error)
  }
}
