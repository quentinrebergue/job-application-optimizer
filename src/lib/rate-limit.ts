import { pool } from '@/lib/db'

// Rate limits on a fixed window, stored in Postgres (table rate_limits,
// migration 013). Callers only see consumeRateLimit(): moving the counters to
// Redis later (#141) changes this file, not them.

export interface RateLimitResult {
  /** False once the key went over its limit in the current window */
  allowed: boolean
  /** Time left before the window starts again */
  retryAfterMs: number
}

/**
 * Counts one hit for `key` and tells whether it is still within `limit` hits
 * per `windowMs`. One statement (insert, add one, or start a new window when
 * the old one is over), so two requests at once cannot both slip through.
 */
export async function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now = new Date(),
): Promise<RateLimitResult> {
  const { rows } = await pool.query<{ count: number; reset_at: Date }>(
    `INSERT INTO rate_limits (key, count, reset_at) VALUES ($1, 1, $2)
     ON CONFLICT (key) DO UPDATE SET
       count    = CASE WHEN rate_limits.reset_at <= $3 THEN 1  ELSE rate_limits.count + 1 END,
       reset_at = CASE WHEN rate_limits.reset_at <= $3 THEN $2 ELSE rate_limits.reset_at END
     RETURNING count, reset_at`,
    [key, new Date(now.getTime() + windowMs), now],
  )
  const row = rows[0]
  return {
    allowed: row.count <= limit,
    retryAfterMs: Math.max(0, row.reset_at.getTime() - now.getTime()),
  }
}

/** Removes the windows that are over; returns how many rows were deleted. */
export async function deleteExpiredRateLimits(now = new Date()): Promise<number> {
  const { rowCount } = await pool.query('DELETE FROM rate_limits WHERE reset_at <= $1', [now])
  return rowCount ?? 0
}

/**
 * The visitor's IP as forwarded by the ingress (X-Real-IP, else the first
 * X-Forwarded-For entry), or null. Only meaningful if the load balancer passes
 * the real client address on: check it before relying on per-IP limits.
 */
export function clientIp(headers: Headers): string | null {
  const real = headers.get('x-real-ip')?.trim()
  if (real) return real
  const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded || null
}

/**
 * False for loopback, private, link-local and carrier-grade NAT addresses: an
 * address like that is the load balancer or a node, shared by every visitor,
 * so limiting it would block everyone at once.
 */
export function isPublicIp(ip: string): boolean {
  const v4 = ip.replace(/^::ffff:/, '').match(/^(\d+)\.(\d+)\.\d+\.\d+$/)
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])]
    if (a === 10 || a === 127 || a === 0) return false
    if (a === 172 && b >= 16 && b <= 31) return false
    if (a === 192 && b === 168) return false
    if (a === 169 && b === 254) return false
    if (a === 100 && b >= 64 && b <= 127) return false
    return true
  }
  const v6 = ip.toLowerCase()
  if (v6 === '::1' || v6.startsWith('fc') || v6.startsWith('fd') || v6.startsWith('fe80')) return false
  return v6.includes(':')
}
