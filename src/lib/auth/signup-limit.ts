import { envNumber } from '@/lib/env'
import { waitFor } from '@/lib/quotas'
import { consumeRateLimit, ipRateKey, isPublicIp, refundRateLimit } from '@/lib/rate-limit'

// How many accounts can be created, and how fast (#210). Each account gets its own AI quotas, so
// without a limit on sign-ups the per-user limits are only a fraction of the real limit; and each
// sign-up sends a mail, which has a daily quota at the mail provider and a sender reputation.
//
// On the counters of rate-limit.ts:
//  - **per address** (IP; an IPv6 address by its /64), per hour and per day: a bot from one machine.
//    A school sits behind one address (NAT), so the numbers must let a whole class sign up together;
//  - **for the whole site**, per day: a surge (a bot from many addresses, the mail quota) is first
//    *reported* (a warning at ALERT) and only stopped at a high MAX that protects the database. A low
//    hard cap would let anyone lock every real visitor out for the day with a few hundred requests.
// The numbers come from the environment, to adjust without a rebuild.

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

export function signupLimits() {
  return {
    perIpHour: envNumber('SIGNUPS_PER_IP_PER_HOUR', 30),
    perIpDay: envNumber('SIGNUPS_PER_IP_PER_DAY', 60),
    /** Sign-ups a day for the whole site after which a warning is logged (once). */
    alertPerDay: envNumber('SIGNUPS_ALERT_PER_DAY', 150),
    /** Sign-ups a day for the whole site after which they are refused. */
    maxPerDay: envNumber('SIGNUPS_MAX_PER_DAY', 1000),
  }
}

export type SignupCheck =
  /** `giveBack` returns the points of this sign-up: for one that was refused for lack of room before an account was made (#258). */
  | { ok: true; giveBack: () => Promise<void> }
  | { ok: false; message: string }

let warned = false
/** Said once per process: without the visitor's real address the per-address limit does nothing. */
function warnOnce(ip: string | null) {
  if (warned) return
  warned = true
  console.warn(`sign-up from ${ip ? `an address that is not public (${ip})` : 'an unknown address'}: the per-address limit is off. Check that the ingress passes the client address (X-Real-IP).`)
}

/** Test only: the warning is said once per process, a test wants to see it again. */
export function resetSignupWarning() {
  warned = false
}

/**
 * Counts one sign-up and says whether it may go ahead. Call it once the form is valid and before the
 * account is created. A private or missing address (the load balancer, a node) is shared by every
 * visitor: it is not limited per address, only for the site as a whole.
 */
export async function checkSignup(ip: string | null, now = new Date()): Promise<SignupCheck> {
  const limits = signupLimits()
  const taken: string[] = []

  if (ip && isPublicIp(ip)) {
    for (const [window, limit, ms] of [['hour', limits.perIpHour, HOUR_MS], ['day', limits.perIpDay, DAY_MS]] as const) {
      const key = `signup-ip:${ipRateKey(ip)}:${window}`
      const { allowed, retryAfterMs } = await consumeRateLimit(key, limit, ms, now)
      taken.push(key)
      if (!allowed) {
        console.warn('sign-up limit reached for an address', { ip, window, limit })
        return { ok: false, message: `Too many sign-ups from your network. Try again in ${waitFor(retryAfterMs)}.` }
      }
    }
  } else {
    warnOnce(ip)
  }

  const site = await consumeRateLimit('signup-all:day', limits.maxPerDay, DAY_MS, now)
  taken.push('signup-all:day')
  // Said once, on the sign-up that crosses the line: a surge is something to look at, not to block.
  if (site.count === limits.alertPerDay + 1) {
    console.warn('sign-up surge: more sign-ups today than usual', { signups: site.count, alert: limits.alertPerDay, max: limits.maxPerDay })
  }
  if (!site.allowed) {
    if (site.count === limits.maxPerDay + 1) console.warn('sign-up limit reached for the whole site', { limit: limits.maxPerDay })
    return { ok: false, message: `Sign-ups are very busy right now. Try again in ${waitFor(site.retryAfterMs)}.` }
  }
  return { ok: true, giveBack: async () => { for (const key of taken) await refundRateLimit(key, now) } }
}
