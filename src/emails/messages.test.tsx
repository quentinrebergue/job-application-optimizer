import { describe, it, expect } from 'vitest'
import { accountDeletedMessage, changeEmailMessage, emailChangeRequestedMessage, emailChangedMessage, emailAlreadyUsedMessage, dataExportedMessage, passwordChangedMessage, resetPasswordMessage, verifyEmailMessage } from './messages'

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

describe('the mails of a change of address (#236)', () => {
  it('sends the new address a link, valid 24 hours, that changes nothing unless opened', async () => {
    const url = 'https://fastresume.tech/verify-email/change?token=abc'
    const mail = await changeEmailMessage('new@b.c', url)
    expect(mail.to).toBe('new@b.c')
    expect(mail.html).toContain(`href="${url}"`)
    expect(mail.text).toContain('24 hours')
  })

  it('tells the current address which address was asked, with a way to react', async () => {
    const mail = await emailChangeRequestedMessage('old@b.c', 'new@b.c', 'https://fastresume.tech/forgot-password')
    expect(mail.text).toContain('new@b.c')
    expect(mail.html).toContain('href="https://fastresume.tech/forgot-password"')
  })

  it('tells the old address it no longer gives access, and whom to write to', async () => {
    const mail = await emailChangedMessage('old@b.c', 'new@b.c', 'contact@fastresume.tech')
    expect(mail.text).toContain('no longer gives access')
    expect(mail.html).toContain('href="mailto:contact@fastresume.tech"')
  })

  it('tells an address that already has an account that someone tried to use it, and that nothing changed', async () => {
    const mail = await emailAlreadyUsedMessage('taken@b.c')
    expect(mail.to).toBe('taken@b.c')
    expect(mail.subject).toBe('This address already has a FastResume account')
    expect(mail.text).toContain('Nothing changed')
  })
})
