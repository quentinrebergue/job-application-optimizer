import { pool } from '@/lib/db'
import { envNumber } from '@/lib/env'
import { waitFor } from '@/lib/quotas'
import { consumeRateLimit, deleteExpiredRateLimits, ipRateKey, isPublicIp, refundRateLimit } from '@/lib/rate-limit'

// The limits on failed logins (#225): per email address, per client address, and a surge counter for the site.
//
//  - **Per email address**: 5 failures in 15 minutes. It stops the guessing of one account's password.
//  - **Per client address** (an IPv6 address by its /64): 60 failures an hour. It stops *credential stuffing*, one
//    machine trying a few passwords on thousands of accounts, each of which stays under its own limit. A class
//    behind one address (NAT) fails a few times at once: the number has to let thirty students sign in together.
//  - **For the whole site**, per hour: a surge of failures is *reported* (a warning at ALERT) and never blocks: a cap
//    on the whole site would let anyone lock every real user out.
//
// Counting is done **before** the password is checked and given back if the login succeeds. Reading the counter,
// checking the password (a quarter of a second) and counting afterwards would let any number of requests sent at the
// same moment all pass the check: the count must be taken in one step, before the wait.
// The numbers of the address limit come from the environment, to adjust without a rebuild.

const HOUR_MS = 60 * 60 * 1000
const EMAIL_WINDOW_MS = 15 * 60 * 1000
export const MAX_FAILURES_PER_EMAIL = 5

export function loginLimits() {
  return {
    perIpHour: envNumber('LOGIN_FAILS_PER_IP_PER_HOUR', 60),
    /** Failed logins an hour for the whole site after which a warning is logged (once an hour). */
    alertPerHour: envNumber('LOGIN_FAILS_ALERT_PER_HOUR', 300),
  }
}

export type LoginAttempt =
  /** `finish` says how the attempt ended: a failure keeps its points, a success or a cancelled attempt (no password was checked) gives them back. */
  | { ok: true; finish: (outcome: 'success' | 'failure' | 'cancelled') => Promise<void> }
  | { ok: false; message: string }

let warned = false
/** Said once per process: without the visitor's real address the per-address limit does nothing. */
function warnOnce(ip: string | null) {
  if (warned) return
  warned = true
  console.warn(`login from ${ip ? `an address that is not public (${ip})` : 'an unknown address'}: the per-address limit is off. Check that the ingress passes the client address (X-Real-IP).`)
}

/** Test only: the warning is said once per process, a test wants to see it again. */
export function resetLoginWarning() {
  warned = false
}

const ipKey = (ip: string) => `login-fail-ip:${ipRateKey(ip)}`

/** Counts one attempt for this email address, in one statement; true while it is within the limit. */
async function countEmail(email: string, now: Date): Promise<boolean> {
  const { rows } = await pool.query<{ count: number }>(
    `INSERT INTO login_attempts (email, count, reset_at) VALUES ($1, 1, $2)
     ON CONFLICT (email) DO UPDATE SET
       count = CASE WHEN login_attempts.reset_at <= $3 THEN 1 ELSE login_attempts.count + 1 END,
       reset_at = CASE WHEN login_attempts.reset_at <= $3 THEN $2 ELSE login_attempts.reset_at END
     RETURNING count`,
    [email, new Date(now.getTime() + EMAIL_WINDOW_MS), now],
  )
  return rows[0].count <= MAX_FAILURES_PER_EMAIL
}

async function refundEmail(email: string, now: Date): Promise<void> {
  await pool.query('UPDATE login_attempts SET count = GREATEST(count - 1, 0) WHERE email = $1 AND reset_at > $2', [email, now])
}

/**
 * Starts a login attempt: counts it for the client address and for the email address, and refuses it when either
 * is over its limit, before any password is checked (even the right one is refused: the limit has to wait). The
 * caller then says how it ended with `finish`. A private or missing address (the load balancer, a node) is shared
 * by every visitor: it is never limited per address.
 */
export async function beginLoginAttempt(ip: string | null, email: string, now = new Date()): Promise<LoginAttempt> {
  const limits = loginLimits()
  const limitedByAddress = Boolean(ip && isPublicIp(ip))

  if (ip && limitedByAddress) {
    const { allowed, count, retryAfterMs } = await consumeRateLimit(ipKey(ip), limits.perIpHour, HOUR_MS, now)
    if (!allowed) {
      // Said once, on the first attempt that is refused.
      if (count === limits.perIpHour + 1) console.warn('login failure limit reached for an address', { ip, limit: limits.perIpHour })
      return { ok: false, message: `Too many failed attempts from your network. Try again in ${waitFor(retryAfterMs)}.` }
    }
  } else {
    warnOnce(ip)
  }

  if (!(await countEmail(email, now))) {
    // Not a failure of the password, so it counts for nobody: not against the address, and not against the email
    // either. Left in, the refused attempts of a burst on one account (a double click, a flood) would keep it
    // locked after the burst, with no failure behind it.
    if (ip && limitedByAddress) await refundRateLimit(ipKey(ip), now)
    await refundEmail(email, now)
    return { ok: false, message: 'Too many attempts. Try again in 15 minutes.' }
  }

  return {
    ok: true,
    finish: async (outcome) => {
      if (outcome !== 'failure') {
        if (ip && limitedByAddress) await refundRateLimit(ipKey(ip), now)
        await refundEmail(email, now)
        return
      }
      // A failure keeps its points; it is also counted for the site.
      const site = await consumeRateLimit('login-fail-all:hour', limits.alertPerHour, HOUR_MS, now)
      // Said once, on the failure that crosses the line: a surge is something to look at, not to block.
      if (site.count === limits.alertPerHour + 1) {
        console.warn('login failure surge: more failed logins this hour than usual', { failures: site.count, alert: limits.alertPerHour })
      }
    },
  }
}

const PURGE_EVERY_MS = 5 * 60 * 1000
let lastPurge = 0

/**
 * Deletes the counters whose window is over (they hold addresses and the emails that were typed). Called after a
 * failed login, at most once every five minutes per process: it bounds what an attack can pile up. It does not
 * replace a scheduled cleanup (#213), which is what guarantees how long they are kept.
 */
export async function purgeExpiredLoginRecords(now = new Date()): Promise<void> {
  if (now.getTime() - lastPurge < PURGE_EVERY_MS) return
  lastPurge = now.getTime()
  await Promise.all([deleteExpiredRateLimits(now), pool.query('DELETE FROM login_attempts WHERE reset_at <= $1', [now])])
}

/** Test only: the purge is spaced out, a test wants to run it again. */
export function resetLoginPurge() {
  lastPurge = 0
}
