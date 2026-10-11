// Is a request that changes data really from the site itself? (#206)
//
// The session cookie is `SameSite=Lax`, which already keeps a form of another *site* from using it.
// This is a second barrier that does not depend on the cookie rules: a page of another origin (another
// site, but also another subdomain or another port, which `SameSite` counts as the same site) cannot get
// the API to change anything for a signed-in visitor.
//
// The browser says where a request comes from, and a page cannot forge these headers:
//  - `Sec-Fetch-Site`: `same-origin` (our own pages), `same-site`, `cross-site` or `none`;
//  - `Origin`: the origin of the page that sent a POST, PUT, PATCH or DELETE;
//  - `Referer`: the address of the page, when `Origin` is missing.
// A request that says none of it does not come from a browser page of ours, so it is refused too: the
// API is for our own pages. Server Actions (sign-in, sign-up) are checked by Next.js itself, which
// compares `Origin` to the host (node_modules/next/dist/docs/01-app/02-guides/data-security.md).

const CHANGES_DATA = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

export type OriginCheck = { ok: true } | { ok: false; reason: string }

/** The host a request was sent to: what the visitor typed, as the ingress passes it on. */
function ownHost(headers: Headers): string | null {
  const forwarded = headers.get('x-forwarded-host')?.split(',')[0].trim()
  return (forwarded || headers.get('host'))?.toLowerCase() ?? null
}

function hostOf(url: string | null): string | null {
  if (!url) return null
  try {
    return new URL(url).host.toLowerCase()
  } catch {
    return null
  }
}

export function checkOrigin(method: string, headers: Headers): OriginCheck {
  if (!CHANGES_DATA.has(method.toUpperCase())) return { ok: true }

  const site = headers.get('sec-fetch-site')
  if (site === 'same-origin') return { ok: true }
  if (site) return { ok: false, reason: `sec-fetch-site is ${site}` }

  // An older browser: no Sec-Fetch-Site. Origin, then Referer, against our own host.
  const host = ownHost(headers)
  const origin = headers.get('origin')
  if (origin) {
    return host && hostOf(origin) === host ? { ok: true } : { ok: false, reason: `origin is ${origin.slice(0, 100)}` }
  }
  const referer = headers.get('referer')
  if (referer) {
    return host && hostOf(referer) === host ? { ok: true } : { ok: false, reason: 'referer is another site' }
  }
  return { ok: false, reason: 'no origin, no referer' }
}
