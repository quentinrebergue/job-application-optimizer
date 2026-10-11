import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { loginUrlFor, returnToFrom } from '@/lib/auth/return-to'
import { buildCsp, cspHeaderName, cspMode, CSP_REPORT_PATH, newNonce } from '@/lib/security/csp'

const PUBLIC_PATHS = ['/login', '/signup', '/forgot-password']
// Open whether signed in or not: the mail link may be opened in another browser,
// and the probes (Kubernetes, uptime check) and crawlers have no session.
const OPEN_PATHS = [
  '/verify-email',
  '/reset-password',
  '/api/healthz',
  '/api/livez',
  // Text pages and what search engines and link previews fetch.
  '/privacy',
  '/legal',
  '/terms',
  '/robots.txt',
  '/sitemap.xml',
  '/opengraph-image',
  // Where the browsers report a violation of the CSP: from visitors who have no session.
  CSP_REPORT_PATH,
]

/**
 * The Content Security Policy of a page, with a nonce of its own (#205). Next.js reads the nonce from
 * the policy in the *request* headers and puts it on its scripts and styles, so the policy goes there
 * as well as in the response. A report-only policy is reported, not enforced, but is read the same way.
 */
function withCsp(request: NextRequest, respond: (init: { request: { headers: Headers } }) => NextResponse): NextResponse {
  const nonce = newNonce()
  const policy = buildCsp(nonce, { dev: process.env.NODE_ENV === 'development' })
  const headers = new Headers(request.headers)
  headers.set('x-nonce', nonce)
  headers.set('content-security-policy', policy)
  const response = respond({ request: { headers } })
  response.headers.set(cspHeaderName(cspMode()), policy)
  return response
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isApiRoute = pathname.startsWith('/api/')
  const isPublicPath = PUBLIC_PATHS.includes(pathname)
  const hasSessionCookie = request.cookies.has('session')

  // The landing page lives at /welcome but is shown at "/" to visitors; signed-in
  // users keep their home at "/". A visitor asking for /welcome goes back to "/"
  // (one address for crawlers); a signed-in user may open it, to see the page.
  if (pathname === '/' && !hasSessionCookie) {
    return withCsp(request, (init) => NextResponse.rewrite(new URL('/welcome', request.url), init))
  }
  if (pathname === '/welcome') {
    return hasSessionCookie ? withCsp(request, (init) => NextResponse.next(init)) : NextResponse.redirect(new URL('/', request.url))
  }

  if (OPEN_PATHS.some((path) => pathname === path || pathname.startsWith(path + '/'))) {
    return isApiRoute ? NextResponse.next() : withCsp(request, (init) => NextResponse.next(init))
  }

  if (isApiRoute) {
    if (!hasSessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.next()
  }

  // Keep the requested page (and its query, e.g. a job imported by the
  // bookmarklet) so the user lands back on it after logging in.
  if (!isPublicPath && !hasSessionCookie) {
    return NextResponse.redirect(new URL(loginUrlFor(pathname, request.nextUrl.searchParams), request.url))
  }

  if (isPublicPath && hasSessionCookie) {
    return NextResponse.redirect(new URL(returnToFrom(request.nextUrl.searchParams), request.url))
  }

  return withCsp(request, (init) => NextResponse.next(init))
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
