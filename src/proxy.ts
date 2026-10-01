import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login', '/signup']

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isApiRoute = pathname.startsWith('/api/')
  const isPublicPath = PUBLIC_PATHS.includes(pathname)
  const hasSessionCookie = request.cookies.has('session')

  if (isApiRoute) {
    if (!hasSessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.next()
  }

  if (!isPublicPath && !hasSessionCookie) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (isPublicPath && hasSessionCookie) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
