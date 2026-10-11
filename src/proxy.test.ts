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
  for (const path of ['/privacy', '/legal', '/terms', '/robots.txt', '/sitemap.xml', '/opengraph-image']) {
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

