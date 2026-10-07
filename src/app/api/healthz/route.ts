import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'

/** The database has this long to answer; the readiness probe waits a bit longer. */
const DB_TIMEOUT_MS = 2000

const NO_STORE = { 'Cache-Control': 'no-store' }

/**
 * Public, no session: "can this app serve a request?". Used by the readiness
 * probe and the external uptime check. It answers 503 when the database does
 * not answer, because the site is down for visitors then. The liveness probe
 * uses /api/livez instead: restarting the app would not fix the database.
 */
export async function GET() {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    await Promise.race([
      pool.query('SELECT 1'),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`database did not answer in ${DB_TIMEOUT_MS} ms`)), DB_TIMEOUT_MS)
      }),
    ])
    return NextResponse.json({ status: 'ok' }, { headers: NO_STORE })
  } catch (err) {
    console.error('healthz: database check failed', err)
    return NextResponse.json({ status: 'unavailable' }, { status: 503, headers: NO_STORE })
  } finally {
    clearTimeout(timer)
  }
}
