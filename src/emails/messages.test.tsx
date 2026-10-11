import { describe, it, expect } from 'vitest'
import { accountDeletedMessage, dataExportedMessage, passwordChangedMessage, resetPasswordMessage, verifyEmailMessage } from './messages'

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

describe('dataExportedMessage', () => {
  it('says a copy was downloaded and links to a password reset', async () => {
    const mail = await dataExportedMessage('a@b.c', 'https://fastresume.tech/forgot-password')
    expect(mail.subject).toBe('A copy of your data was downloaded')
    expect(mail.html).toContain('href="https://fastresume.tech/forgot-password"')
    expect(mail.text).toContain('downloaded')
  })
})

describe('accountDeletedMessage', () => {
  it('says the account is gone, that backups keep a copy for 7 days, and whom to write to', async () => {
    const mail = await accountDeletedMessage('a@b.c', 'contact@fastresume.tech')
    expect(mail.subject).toBe('Your account was deleted')
    expect(mail.text).toContain('7 days')
    expect(mail.html).toContain('href="mailto:contact@fastresume.tech"')
  })
})
