import { describe, it, expect } from 'vitest'
import nextConfig from '../../next.config'

describe('security headers of next.config.ts (#205)', () => {
  it('sends them on every path', async () => {
    const rules = await nextConfig.headers!()
    expect(rules).toHaveLength(1)
    expect(rules[0].source).toBe('/:path*')
  })

  it('has nosniff, a referrer policy, no framing and no camera, microphone or position', async () => {
    const headers = Object.fromEntries((await nextConfig.headers!())[0].headers.map((h) => [h.key, h.value]))
    expect(headers['X-Content-Type-Options']).toBe('nosniff')
    expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin')
    expect(headers['X-Frame-Options']).toBe('DENY')
    expect(headers['Permissions-Policy']).toContain('camera=()')
    expect(headers['Permissions-Policy']).toContain('microphone=()')
    expect(headers['Permissions-Policy']).toContain('geolocation=()')
  })

  it('leaves HSTS to the ingress, which already sends it: two values for one header are ambiguous', async () => {
    const keys = (await nextConfig.headers!())[0].headers.map((h) => h.key.toLowerCase())
    expect(keys).not.toContain('strict-transport-security')
  })

  it('does not name the framework', () => {
    expect(nextConfig.poweredByHeader).toBe(false)
  })
})
