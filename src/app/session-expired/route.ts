import { NextResponse } from 'next/server'
import { clearStaleSession } from '@/lib/auth/session'
import { appUrl } from '@/lib/email/providers'

/**
 * Where a private page sends a visitor whose session is gone (#178). A cookie that points at no
 * session would otherwise bounce between the page and /login: the proxy sends a visitor with a
 * cookie away from /login. Here the cookie is removed (a page cannot do it), then the login page
 * opens. A session that is still valid is left alone, so a link to this address signs nobody out.
 * The redirect is built from APP_URL, not from the request: in the container the request URL is the
 * server's own address (HOSTNAME=0.0.0.0), which a browser cannot open (see /verify-email/confirm).
 */
export async function GET() {
  const stale = await clearStaleSession()
  return NextResponse.redirect(new URL(stale ? '/login' : '/', appUrl()))
}
