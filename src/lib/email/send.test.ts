import { describe, it, expect, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const { sendEmail } = await import('./send')
const { smtpProviders } = await import('./providers')

const MAIL = { to: 'a@b.c', subject: 'Hi', text: 'Hello', html: '<p>Hello</p>' }
const BREVO = { name: 'primary' as const, host: 'smtp-relay.brevo.com', port: 587, user: 'u', password: 'p' }
const SCALEWAY = { name: 'fallback' as const, host: 'smtp.tem.scaleway.com', port: 587, user: 'u2', password: 'p2' }

describe('smtpProviders', () => {
  it('reads the primary and, when set, the fallback', () => {
    const env = {
      SMTP_HOST: 'h1', SMTP_USER: 'u1', SMTP_PASSWORD: 'p1',
      SMTP_FALLBACK_HOST: 'h2', SMTP_FALLBACK_PORT: '2587', SMTP_FALLBACK_USER: 'u2', SMTP_FALLBACK_PASSWORD: 'p2',
    }
    expect(smtpProviders(env).map((p) => [p.name, p.host, p.port])).toEqual([['primary', 'h1', 587], ['fallback', 'h2', 2587]])
  })

  it('ignores a provider with a missing setting', () => {
    expect(smtpProviders({ SMTP_HOST: 'h1', SMTP_USER: 'u1' })).toEqual([])
  })
})

describe('sendEmail', () => {
  it('sends through the primary when it works', async () => {
    const transport = vi.fn().mockResolvedValue(undefined)
    await sendEmail(MAIL, { providers: [BREVO, SCALEWAY], transport })
    expect(transport).toHaveBeenCalledTimes(1)
    expect(transport.mock.calls[0][0]).toBe(BREVO)
  })

  it('falls back to the next provider when the primary fails', async () => {
    const transport = vi.fn().mockRejectedValueOnce(new Error('daily quota reached')).mockResolvedValueOnce(undefined)
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await sendEmail(MAIL, { providers: [BREVO, SCALEWAY], transport })
    expect(transport.mock.calls.map((c) => c[0])).toEqual([BREVO, SCALEWAY])
  })

  it('throws when every provider fails', async () => {
    const transport = vi.fn().mockRejectedValue(new Error('down'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(sendEmail(MAIL, { providers: [BREVO, SCALEWAY], transport })).rejects.toThrow('Every mail provider failed')
  })

  it('prints the mail outside production when no provider is set', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})
    await sendEmail(MAIL, { providers: [] })
    expect(info.mock.calls[0][0]).toContain('Hello')
  })
})
