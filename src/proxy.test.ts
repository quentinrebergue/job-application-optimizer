import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { proxy } from './proxy'
import { afterEach, vi } from 'vitest'

function request(path: string, session = false) {
  return new NextRequest(`https://fastresume.tech${path}`, session ? { headers: { cookie: 'session=abc' } } : undefined)
}

describe('proxy: landing page', () => {
  it('shows the landing page at "/" to a visitor, keeping the URL', () => {
    const res = proxy(request('/'))
    expect(res.headers.get('x-middleware-rewrite')).toBe('https://fastresume.tech/welcome')
    expect(res.status).toBe(200)
  })

  it('leaves "/" to a signed-in user', () => {
    const res = proxy(request('/', true))
    expect(res.headers.get('x-middleware-rewrite')).toBeNull()
    expect(res.status).toBe(200)
  })

  it('sends a visitor asking for /welcome back to "/" instead of showing a second URL', () => {
    const res = proxy(request('/welcome'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('https://fastresume.tech/')
  })

  it('lets a signed-in user open /welcome, to see the landing page', () => {
    const res = proxy(request('/welcome', true))
    expect(res.headers.get('location')).toBeNull()
    expect(res.status).toBe(200)
  })

  it('still sends a visitor to the login page for a private page', () => {
    const res = proxy(request('/jobs'))
    expect(res.headers.get('location')).toContain('/login')
  })
})

describe('proxy: pages open to everyone', () => {
  for (const path of ['/privacy', '/legal', '/terms', '/robots.txt', '/sitemap.xml', '/opengraph-image', '/icon.svg', '/apple-icon.png']) {
    it(`lets a visitor read ${path}`, () => {
      const res = proxy(request(path))
      expect(res.headers.get('location')).toBeNull()
      expect(res.status).toBe(200)
    })
  }

  it('lets a signed-in user read the privacy page too, without sending them home', () => {
    const res = proxy(request('/privacy', true))
    expect(res.headers.get('location')).toBeNull()
  })
})

describe('proxy: Content Security Policy (#205)', () => {
  afterEach(() => vi.unstubAllEnvs())
  const policyOf = (res: Response) => res.headers.get('content-security-policy')

  it('puts a policy on a page, with a nonce that is also in the request headers for Next.js to read', () => {
    const res = proxy(request('/privacy'))
    const policy = policyOf(res)!
    expect(policy).toContain("default-src 'self'")
    const nonce = policy.match(/'nonce-([^']+)'/)![1]
    expect(res.headers.get('x-middleware-request-x-nonce')).toBe(nonce)
    expect(res.headers.get('x-middleware-request-content-security-policy')).toBe(policy)
  })

  it('uses a different nonce for each request', () => {
    const nonce = () => policyOf(proxy(request('/privacy')))!.match(/'nonce-([^']+)'/)![1]
    expect(new Set([nonce(), nonce(), nonce()]).size).toBe(3)
  })

  it('covers the landing page at "/", the pages of a signed-in user and /welcome', () => {
    expect(policyOf(proxy(request('/')))).toContain("frame-ancestors 'none'")
    expect(policyOf(proxy(request('/jobs', true)))).toContain("frame-ancestors 'none'")
    expect(policyOf(proxy(request('/welcome', true)))).toContain("frame-ancestors 'none'")
  })

  it('does not put it on an API answer', () => {
    expect(policyOf(proxy(request('/api/healthz')))).toBeNull()
    expect(policyOf(proxy(request('/api/jobs', true)))).toBeNull()
  })

  it('lets the browsers report a violation without a session', () => {
    const res = proxy(request('/api/csp-report'))
    expect(res.status).toBe(200)
    expect(res.headers.get('location')).toBeNull()
  })

  it('only reports in report-only mode, under the other header name', () => {
    vi.stubEnv('CSP_MODE', 'report-only')
    const res = proxy(request('/privacy'))
    expect(res.headers.get('content-security-policy')).toBeNull()
    expect(res.headers.get('content-security-policy-report-only')).toContain("default-src 'self'")
    expect(res.headers.get('x-middleware-request-content-security-policy')).toContain("default-src 'self'")
  })
})

describe('proxy: requests that change data must come from the site (#206)', () => {
  const api = (path: string, method: string, headers: Record<string, string> = {}) =>
    new NextRequest(`https://fastresume.tech${path}`, { method, headers: { cookie: 'session=abc', host: 'fastresume.tech', ...headers } })

  it('answers 403 to a POST from another site, with a code, and never reaches the route', async () => {
    const res = proxy(api('/api/jobs', 'POST', { 'sec-fetch-site': 'cross-site', origin: 'https://evil.test' }))
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: 'This request does not come from the site itself.', code: 'bad_origin' })
  })

  it.each(['POST', 'PUT', 'PATCH', 'DELETE'])('refuses a %s from another origin of the same site', (method) => {
    expect(proxy(api('/api/entities/projects/x', method, { 'sec-fetch-site': 'same-site' })).status).toBe(403)
  })

  it('lets a request from our own pages through', () => {
    const res = proxy(api('/api/jobs', 'POST', { 'sec-fetch-site': 'same-origin' }))
    expect(res.status).toBe(200)
    expect(res.headers.get('x-middleware-next')).toBe('1')
  })

  it('checks before the session: a visitor from another site gets 403, not a hint about the session', () => {
    const res = proxy(new NextRequest('https://fastresume.tech/api/jobs', { method: 'POST', headers: { host: 'fastresume.tech', 'sec-fetch-site': 'cross-site' } }))
    expect(res.status).toBe(403)
  })

  it('does not touch a read', () => {
    expect(proxy(api('/api/jobs', 'GET', { 'sec-fetch-site': 'cross-site' })).status).toBe(200)
  })

  it('does not touch the reports of the Content Security Policy, which the browser sends its own way', () => {
    expect(proxy(new NextRequest('https://fastresume.tech/api/csp-report', { method: 'POST', headers: { host: 'fastresume.tech' } })).status).toBe(200)
  })

  it('does not touch the pages: Next.js checks the Server Actions itself', () => {
    expect(proxy(new NextRequest('https://fastresume.tech/login', { method: 'POST', headers: { host: 'fastresume.tech', 'sec-fetch-site': 'cross-site' } })).status).toBe(200)
  })
})


describe('proxy: the link of a change of address (#236)', () => {
  it('opens for a visitor: the mail may be opened in another browser', () => {
    const res = proxy(request('/verify-email/change'))
    expect(res.headers.get('location')).toBeNull()
    expect(res.status).toBe(200)
  })
})

describe('proxy: stale session cookie (#178)', () => {
  it('lets a visitor with a cookie reach the cleaning route, where the cookie is checked', () => {
    const res = proxy(request('/session-expired', true))
    expect(res.headers.get('location')).toBeNull()
    expect(res.status).toBe(200)
  })
})
