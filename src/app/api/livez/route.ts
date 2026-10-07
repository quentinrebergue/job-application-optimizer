import { NextResponse } from 'next/server'

/**
 * Public, no session, no dependency: "is the process running and answering?".
 * The liveness probe restarts the pod when this fails, so it must not depend
 * on the database (see /api/healthz).
 */
export async function GET() {
  return NextResponse.json({ status: 'ok' }, { headers: { 'Cache-Control': 'no-store' } })
}
