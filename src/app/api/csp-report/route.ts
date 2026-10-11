import { headers } from 'next/headers'
import { clientIp, consumeRateLimit, ipRateKey, isPublicIp } from '@/lib/rate-limit'

// Where the browsers report what the Content Security Policy blocked (#205). It is open to everyone (a
// visitor has no session) and answers 204 whatever it receives, so it gives nothing away. Each report is
// written to the log as one short line and not stored. Small bodies only, and a limit per address, so it
// cannot be used to fill the log or the database.

const MAX_BYTES = 8 * 1024
const PER_MINUTE = 30

/** A URL in a report, without its query or fragment (they can hold tokens), at most 200 characters. */
function short(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value) return undefined
  return value.split(/[?#]/)[0].slice(0, 200)
}

/** The same fields from the two formats browsers use: `report-uri` (an object) and the Reporting API (a list). */
export function readReports(body: unknown): Array<{ directive?: string; blocked?: string; page?: string; source?: string }> {
  const items = Array.isArray(body) ? body.map((r) => (r && typeof r === 'object' ? (r as { body?: unknown }).body : undefined)) : [body && typeof body === 'object' ? (body as Record<string, unknown>)['csp-report'] : undefined]
  return items.flatMap((raw) => {
    if (!raw || typeof raw !== 'object') return []
    const r = raw as Record<string, unknown>
    return [{
      directive: short(r['effective-directive'] ?? r['effectiveDirective'] ?? r['violated-directive']),
      blocked: short(r['blocked-uri'] ?? r['blockedURL']),
      page: short(r['document-uri'] ?? r['documentURL']),
      source: short(r['source-file'] ?? r['sourceFile']),
    }]
  })
}

export async function POST(request: Request) {
  const done = new Response(null, { status: 204 })
  const declared = Number(request.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > MAX_BYTES) return done

  const ip = clientIp(await headers())
  if (ip && isPublicIp(ip)) {
    const { allowed } = await consumeRateLimit(`csp-report:${ipRateKey(ip)}`, PER_MINUTE, 60_000)
    if (!allowed) return done
  }

  const text = (await request.text().catch(() => '')).slice(0, MAX_BYTES)
  let body: unknown
  try {
    body = JSON.parse(text)
  } catch {
    return done
  }
  for (const report of readReports(body).slice(0, 5)) console.warn('csp violation', report)
  return done
}
