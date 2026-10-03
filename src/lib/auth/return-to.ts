// Where to send a user after login or signup.
//
// A signed-out visit to /jobs/new?title=...&description=... is redirected to
// /login?next=/jobs/new&title=...&description=... : the original query is kept
// as is and only the path goes into `next`. Encoding the whole URL into `next`
// would encode the (long) imported description twice and could exceed the
// ingress request-line limit.

export const NEXT_PARAM = 'next'

/** A same-site path, or '/' for anything else (absolute URLs, //host, /\host). */
export function safePath(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/')) return '/'
  if (value.startsWith('//') || value.startsWith('/\\')) return '/'
  return value
}

/** Login URL for a signed-out visit to `pathname` with `searchParams`. */
export function loginUrlFor(pathname: string, searchParams: URLSearchParams): string {
  const params = new URLSearchParams(searchParams)
  params.delete(NEXT_PARAM)
  if (pathname !== '/') params.set(NEXT_PARAM, pathname)
  const query = params.toString()
  return query ? `/login?${query}` : '/login'
}

/** Page to return to, rebuilt from the login or signup page's own query. */
export function returnToFrom(searchParams: URLSearchParams): string {
  const params = new URLSearchParams(searchParams)
  const path = safePath(params.get(NEXT_PARAM) ?? '/')
  params.delete(NEXT_PARAM)
  if (path === '/') return '/'
  const query = params.toString()
  return query ? `${path}?${query}` : path
}

/** A page's `searchParams` object as URLSearchParams (repeated keys kept). */
export function toSearchParams(record: Record<string, string | string[] | undefined>): URLSearchParams {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(record)) {
    for (const v of Array.isArray(value) ? value : value === undefined ? [] : [value]) params.append(key, v)
  }
  return params
}
