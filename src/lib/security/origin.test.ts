import { describe, it, expect } from 'vitest'
import { checkOrigin } from './origin'

const headers = (h: Record<string, string>) => new Headers(h)
const HOST = { host: 'fastresume.tech' }

describe('checkOrigin: what is never checked', () => {
  it.each(['GET', 'HEAD', 'OPTIONS'])('lets a %s through, it changes nothing', (method) => {
    expect(checkOrigin(method, headers({ 'sec-fetch-site': 'cross-site' }))).toEqual({ ok: true })
  })
})

describe('checkOrigin: a browser that sends Sec-Fetch-Site', () => {
  it.each(['POST', 'PUT', 'PATCH', 'DELETE'])('accepts a %s from our own pages', (method) => {
    expect(checkOrigin(method, headers({ 'sec-fetch-site': 'same-origin' }))).toEqual({ ok: true })
  })

  it('refuses another site', () => {
    expect(checkOrigin('POST', headers({ 'sec-fetch-site': 'cross-site' }))).toEqual({ ok: false, reason: 'sec-fetch-site is cross-site' })
  })

  it('refuses another origin of the same site (another subdomain, another port), which SameSite lets through', () => {
    expect(checkOrigin('DELETE', headers({ 'sec-fetch-site': 'same-site', origin: 'https://other.fastresume.tech', ...HOST })).ok).toBe(false)
  })

  it('does not let a matching Origin override what the browser says', () => {
    expect(checkOrigin('POST', headers({ 'sec-fetch-site': 'cross-site', origin: 'https://fastresume.tech', ...HOST })).ok).toBe(false)
  })

  it('refuses "none", which a POST made by a page never has', () => {
    expect(checkOrigin('POST', headers({ 'sec-fetch-site': 'none' })).ok).toBe(false)
  })
})

describe('checkOrigin: an older browser, by Origin then Referer', () => {
  it('accepts an Origin that is our own host', () => {
    expect(checkOrigin('POST', headers({ origin: 'https://fastresume.tech', ...HOST }))).toEqual({ ok: true })
  })

  it('accepts the www address when that is the host the visitor used', () => {
    expect(checkOrigin('POST', headers({ origin: 'https://www.fastresume.tech', host: 'www.fastresume.tech' }))).toEqual({ ok: true })
  })

  it('compares with the host the ingress passes on (x-forwarded-host first, then host)', () => {
    expect(checkOrigin('POST', headers({ origin: 'https://fastresume.tech', 'x-forwarded-host': 'fastresume.tech', host: 'job-optimizer-app:3000' })).ok).toBe(true)
    expect(checkOrigin('POST', headers({ origin: 'https://fastresume.tech', 'x-forwarded-host': 'fastresume.tech, internal', host: 'x' })).ok).toBe(true)
  })

  it('works on localhost with a port', () => {
    expect(checkOrigin('POST', headers({ origin: 'http://localhost:3000', host: 'localhost:3000' })).ok).toBe(true)
    expect(checkOrigin('POST', headers({ origin: 'http://localhost:3100', host: 'localhost:3000' })).ok).toBe(false)
  })

  it.each([
    ['another site', 'https://evil.test'],
    ['a look-alike that starts with our name', 'https://fastresume.tech.evil.test'],
    ['a look-alike that ends with our name', 'https://evilfastresume.tech'],
    ['the literal "null" of a sandboxed page or a redirect', 'null'],
    ['something that is not a URL', 'garbage'],
  ])('refuses %s', (_name, origin) => {
    expect(checkOrigin('POST', headers({ origin, ...HOST })).ok).toBe(false)
  })

  it('falls back to the Referer when there is no Origin', () => {
    expect(checkOrigin('POST', headers({ referer: 'https://fastresume.tech/jobs/new?x=1', ...HOST })).ok).toBe(true)
    expect(checkOrigin('POST', headers({ referer: 'https://evil.test/jobs', ...HOST })).ok).toBe(false)
  })

  it('prefers the Origin to the Referer', () => {
    expect(checkOrigin('POST', headers({ origin: 'https://evil.test', referer: 'https://fastresume.tech/', ...HOST })).ok).toBe(false)
  })

  it('refuses a request that says nothing about where it comes from', () => {
    expect(checkOrigin('POST', headers(HOST))).toEqual({ ok: false, reason: 'no origin, no referer' })
  })

  it('refuses when it does not know its own host', () => {
    expect(checkOrigin('POST', headers({ origin: 'https://fastresume.tech' })).ok).toBe(false)
  })
})
