import { NextResponse } from 'next/server'
import { envNumber } from '@/lib/env'
import { consumeRateLimit } from '@/lib/rate-limit'

// How much a user may create, and how fast (#202). Two kinds of limit, because one is not enough:
//  - a cap on what exists (100 jobs; the caps on entries are constants, config/limits.ts, because the
//    library shows them): someone at the cap who deletes 3 and adds 3, again and again,
//    never goes over it;
//  - a limit on creations per hour and per day. The counters of rate-limit.ts count what was
//    created, not what is left, so a delete does not give the quota back and create/delete/create
//    in a loop is stopped.
// The numbers are generous on purpose (a real person never meets them) and come from the
// environment, to adjust from real usage without a rebuild.

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

export type QuotaKind = 'job' | 'entity' | 'pdf' | 'import'

/** The numbers, read each time so a change of environment applies without a restart of the tests. */
export function quotas() {
  return {
    maxJobs: envNumber('MAX_JOBS', 100),
    perHour: {
      job: envNumber('JOBS_PER_HOUR', 15),
      entity: envNumber('ENTITIES_PER_HOUR', 30),
      pdf: envNumber('PDFS_PER_HOUR', 30),
      // Importing a resume is done once by most people (#267): a few tries, in case the first file is a picture.
      import: envNumber('IMPORTS_PER_HOUR', 3),
    },
    perDay: {
      job: envNumber('JOBS_PER_DAY', 40),
      entity: envNumber('ENTITIES_PER_DAY', 100),
      pdf: envNumber('PDFS_PER_DAY', 100),
      import: envNumber('IMPORTS_PER_DAY', 3),
    },
  }
}

const NOUNS: Record<QuotaKind, string> = { job: 'jobs', entity: 'entries', pdf: 'PDFs', import: 'imports' }

/** "3 minutes", "about 2 hours": how long to wait, never less than a minute. */
export function waitFor(ms: number): string {
  const minutes = Math.max(1, Math.ceil(ms / 60_000))
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''}`
  const hours = Math.round(minutes / 60)
  return `about ${hours} hour${hours > 1 ? 's' : ''}`
}

/** The answer when a cap is reached: nothing to wait for, something to delete. */
export function capReached(max: number, noun: string): NextResponse {
  return NextResponse.json(
    { error: `You have reached the limit of ${max} ${noun}. Delete one to add another.`, code: 'limit_reached' },
    { status: 403 },
  )
}

/**
 * Counts one creation of `kind` for the user and returns the 429 to send when an hourly or
 * daily limit is over, or null. Call it once the request is valid and just before the write.
 */
export async function consumeCreation(userId: string, kind: QuotaKind): Promise<NextResponse | null> {
  const windows = [
    { name: 'hour', limit: quotas().perHour[kind], ms: HOUR_MS },
    { name: 'day', limit: quotas().perDay[kind], ms: DAY_MS },
  ]
  for (const { name, limit, ms } of windows) {
    const { allowed, retryAfterMs } = await consumeRateLimit(`create:${kind}:${userId}:${name}`, limit, ms)
    if (!allowed) {
      console.warn('creation limit reached', { userId, kind, window: name, limit })
      return NextResponse.json(
        { error: `Too many ${NOUNS[kind]} in a short time (${limit} per ${name}). Try again in ${waitFor(retryAfterMs)}.`, code: 'rate_limited' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(retryAfterMs / 1000)) } },
      )
    }
  }
  return null
}
