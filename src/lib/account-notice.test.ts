import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))
const after = vi.fn()
vi.mock('next/server', () => ({ after: (fn: () => Promise<void>) => after(fn) }))
const sendEmail = vi.fn()
vi.mock('@/lib/email/send', () => ({ sendEmail: (...a: unknown[]) => sendEmail(...a) }))
vi.mock('@/lib/email/providers', () => ({ appUrl: () => 'https://fastresume.tech' }))
const consumeRateLimit = vi.fn()
vi.mock('@/lib/rate-limit', () => ({ consumeRateLimit: (...a: unknown[]) => consumeRateLimit(...a) }))

const { noticeAccountDeleted, noticeDataExported } = await import('./account-notice')

/** Runs what was handed to after(): the mail goes out once the response is sent. */
const flush = async () => {
  for (const [fn] of after.mock.calls) await fn()
}

beforeEach(() => {
  after.mockReset()
  sendEmail.mockReset().mockResolvedValue(undefined)
  consumeRateLimit.mockReset().mockResolvedValue({ allowed: true })
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('noticeDataExported', () => {
  it('mails the owner after the response, with a way to reset the password', async () => {
    await noticeDataExported('u1', 'a@example.test')
    expect(sendEmail).not.toHaveBeenCalled()
    await flush()
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: 'a@example.test', subject: 'A copy of your data was downloaded' }))
    expect(sendEmail.mock.calls[0][0].html).toContain('https://fastresume.tech/forgot-password')
  })

  it('sends at most one mail an hour per user: ten exports do not become ten mails', async () => {
    consumeRateLimit.mockResolvedValue({ allowed: false })
    await noticeDataExported('u1', 'a@example.test')
    await flush()
    expect(sendEmail).not.toHaveBeenCalled()
    expect(consumeRateLimit).toHaveBeenCalledWith('account-export-mail:u1', 1, 3_600_000)
  })

  it('does not fail when the mail cannot be sent', async () => {
    sendEmail.mockRejectedValue(new Error('smtp down'))
    await noticeDataExported('u1', 'a@example.test')
    await expect(flush()).resolves.toBeUndefined()
  })
})

describe('noticeAccountDeleted', () => {
  it('mails the address that the account is gone, after the response', async () => {
    noticeAccountDeleted('a@example.test')
    await flush()
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: 'a@example.test', subject: 'Your account was deleted' }))
  })

  it('does not fail when the mail cannot be sent', async () => {
    sendEmail.mockRejectedValue(new Error('smtp down'))
    noticeAccountDeleted('a@example.test')
    await expect(flush()).resolves.toBeUndefined()
  })
})
