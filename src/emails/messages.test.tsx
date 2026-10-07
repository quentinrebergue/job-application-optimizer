import { describe, it, expect } from 'vitest'
import { passwordChangedMessage, resetPasswordMessage, verifyEmailMessage } from './messages'

describe('verifyEmailMessage', () => {
  const url = 'https://fastresume.tech/verify-email/confirm?token=abc'

  it('puts the link in the HTML and the plain-text versions', async () => {
    const mail = await verifyEmailMessage('a@b.c', url)
    expect(mail.to).toBe('a@b.c')
    expect(mail.subject).toBe('Confirm your email address')
    expect(mail.html).toContain('href="https://fastresume.tech/verify-email/confirm?token=abc"')
    expect(mail.text).toContain(url)
    expect(mail.text).not.toContain('<')
  })

  it('escapes what goes into the HTML', async () => {
    const mail = await verifyEmailMessage('a@b.c', 'https://x.y/?a="><script>alert(1)</script>')
    expect(mail.html).not.toContain('<script>')
  })
})

describe('resetPasswordMessage', () => {
  it('puts the reset link in both versions', async () => {
    const url = 'https://fastresume.tech/reset-password?token=abc'
    const mail = await resetPasswordMessage('a@b.c', url)
    expect(mail.subject).toBe('Reset your password')
    expect(mail.html).toContain(`href="${url}"`)
    expect(mail.text).toContain(url)
  })
})

describe('passwordChangedMessage', () => {
  it('links to a new reset', async () => {
    const mail = await passwordChangedMessage('a@b.c', 'https://fastresume.tech/forgot-password')
    expect(mail.subject).toBe('Your password was changed')
    expect(mail.html).toContain('href="https://fastresume.tech/forgot-password"')
  })
})
