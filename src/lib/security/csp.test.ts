import { describe, it, expect, afterEach, vi } from 'vitest'
import { buildCsp, cspHeaderName, cspMode, newNonce } from './csp'

afterEach(() => vi.unstubAllEnvs())

const directive = (policy: string, name: string) => policy.split('; ').find((d) => d.startsWith(`${name} `))

describe('buildCsp', () => {
  const policy = buildCsp('abc123')

  it('allows only the app itself by default, and no plugin or framing', () => {
    expect(directive(policy, 'default-src')).toBe("default-src 'self'")
    expect(directive(policy, 'object-src')).toBe("object-src 'none'")
    expect(directive(policy, 'frame-ancestors')).toBe("frame-ancestors 'none'")
    expect(directive(policy, 'base-uri')).toBe("base-uri 'self'")
    expect(directive(policy, 'form-action')).toBe("form-action 'self'")
  })

  it('runs only the scripts that carry the nonce (and what they load), no inline script, no eval', () => {
    const script = directive(policy, 'script-src')!
    expect(script).toContain("'nonce-abc123'")
    expect(script).toContain("'strict-dynamic'")
    expect(script).not.toContain('unsafe-inline')
    expect(script).not.toContain('unsafe-eval')
  })

  it('has the nonce on style elements and an opening for style attributes only', () => {
    expect(directive(policy, 'style-src')).toBe("style-src 'self' 'nonce-abc123'")
    expect(directive(policy, 'style-src-attr')).toBe("style-src-attr 'unsafe-inline'")
  })

  it('names no external origin: nothing is loaded from elsewhere', () => {
    expect(policy).not.toMatch(/https?:\/\//)
    expect(policy).not.toContain('*')
  })

  it('reports to the log endpoint', () => {
    expect(policy).toContain('report-uri /api/csp-report')
  })

  it('only the development policy allows eval, inline styles and the dev server socket', () => {
    const dev = buildCsp('abc123', { dev: true })
    expect(directive(dev, 'script-src')).toContain("'unsafe-eval'")
    expect(directive(dev, 'style-src')).toContain("'unsafe-inline'")
    expect(directive(dev, 'connect-src')).toContain('ws:')
    expect(policy).not.toContain('ws:')
  })
})

describe('newNonce', () => {
  it('is different for every request and safe in a header', () => {
    const nonces = new Set(Array.from({ length: 50 }, () => newNonce()))
    expect(nonces.size).toBe(50)
    for (const n of nonces) expect(n).toMatch(/^[A-Za-z0-9+/=]+$/)
  })
})

describe('mode', () => {
  it('enforces unless asked to only report', () => {
    expect(cspMode()).toBe('enforce')
    vi.stubEnv('CSP_MODE', 'report-only')
    expect(cspMode()).toBe('report-only')
    vi.stubEnv('CSP_MODE', 'anything else')
    expect(cspMode()).toBe('enforce')
  })

  it('uses the header that matches the mode', () => {
    expect(cspHeaderName('enforce')).toBe('Content-Security-Policy')
    expect(cspHeaderName('report-only')).toBe('Content-Security-Policy-Report-Only')
  })
})
