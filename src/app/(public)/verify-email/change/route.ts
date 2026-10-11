import { NextResponse, type NextRequest } from 'next/server'
import { confirmEmailChange } from '@/lib/auth/credentials'
import { appUrl } from '@/lib/email/providers'

// The link sent to the NEW address (#236). Like /verify-email/confirm: a route handler that changes data,
// then redirects to the page that shows the result, so the token leaves the URL.
export async function GET(request: NextRequest) {
  const result = await confirmEmailChange(request.nextUrl.searchParams.get('token'))
  // The page of /verify-email has a message for each of these.
  const status = { changed: 'email-changed', taken: 'email-taken' }[result as 'changed' | 'taken'] ?? result
  return NextResponse.redirect(new URL(`/verify-email?status=${status}`, appUrl()))
}
