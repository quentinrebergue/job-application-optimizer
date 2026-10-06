import { NextResponse, type NextRequest } from 'next/server'
import { confirmEmail } from '@/lib/auth/email-verification'
import { appUrl } from '@/lib/email/providers'

// The link of the confirmation mail. A route handler, not a page: it changes
// data, then redirects to the page that shows the result (the token leaves the URL).
// The redirect is built from APP_URL, not from the request: behind the ingress
// (or `next dev -H 0.0.0.0`) the request URL is the server's own address, where
// the session cookie is not sent.
export async function GET(request: NextRequest) {
  const status = await confirmEmail(request.nextUrl.searchParams.get('token'))
  return NextResponse.redirect(new URL(`/verify-email?status=${status}`, appUrl()))
}
