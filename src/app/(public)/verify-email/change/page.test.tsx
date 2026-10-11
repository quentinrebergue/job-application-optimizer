import { describe, it, expect, vi, beforeEach } from 'vitest'

const peekEmailChangeToken = vi.fn()
vi.mock('@/lib/data/email-tokens', () => ({ peekEmailChangeToken: (...a: unknown[]) => peekEmailChangeToken(...a) }))
vi.mock('@/app/actions/email-change', () => ({ confirmEmailChangeAction: vi.fn() }))
const redirect = vi.fn((path: string) => {
  throw new Error(`REDIRECT ${path}`)
})
vi.mock('next/navigation', () => ({ redirect: (p: string) => redirect(p) }))

const { default: Page } = await import('./page')

const open = (token?: string | string[]) =>
  Page({ searchParams: Promise.resolve(token === undefined ? {} : { token }) } as never)

beforeEach(() => peekEmailChangeToken.mockReset())

describe('the page of the link of a change of address (#236)', () => {
  it('only reads the link: it shows the address and a button, and changes nothing by itself', async () => {
    peekEmailChangeToken.mockResolvedValue({ userId: 'u1', newEmail: 'new@example.test' })
    const page = JSON.stringify(await open('tok'))
    expect(page).toContain('new@example.test')
    expect(page).toContain('Confirm new address')
    expect(peekEmailChangeToken).toHaveBeenCalledWith('tok')
  })

  it('sends a used, expired or invalid link to the page that says so', async () => {
    peekEmailChangeToken.mockResolvedValue({ failure: 'used' })
    await expect(open('tok')).rejects.toThrow('REDIRECT /verify-email?status=used')
    peekEmailChangeToken.mockResolvedValue({ failure: 'expired' })
    await expect(open('tok')).rejects.toThrow('REDIRECT /verify-email?status=expired')
  })

  it('refuses a missing or repeated token without looking anything up', async () => {
    await expect(open()).rejects.toThrow('REDIRECT /verify-email?status=invalid')
    await expect(open(['a', 'b'])).rejects.toThrow('REDIRECT /verify-email?status=invalid')
    expect(peekEmailChangeToken).not.toHaveBeenCalled()
  })
})
