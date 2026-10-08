import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { loginUrlFor, returnToFrom } from '@/lib/auth/return-to'

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
]

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isApiRoute = pathname.startsWith('/api/')
  const isPublicPath = PUBLIC_PATHS.includes(pathname)
  const hasSessionCookie = request.cookies.has('session')

  // The landing page lives at /welcome but is shown at "/" to visitors; signed-in
  // users keep their home at "/". A visitor asking for /welcome goes back to "/"
  // (one address for crawlers); a signed-in user may open it, to see the page.
  if (pathname === '/' && !hasSessionCookie) {
    return NextResponse.rewrite(new URL('/welcome', request.url))
  }
  if (pathname === '/welcome') {
    return hasSessionCookie ? NextResponse.next() : NextResponse.redirect(new URL('/', request.url))
  }

  if (OPEN_PATHS.some((path) => pathname === path || pathname.startsWith(path + '/'))) {
    return NextResponse.next()
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

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
