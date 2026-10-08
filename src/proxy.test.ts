import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { proxy } from './proxy'

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

