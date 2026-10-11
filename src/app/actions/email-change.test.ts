import { describe, it, expect, vi, beforeEach } from 'vitest'

const confirmEmailChange = vi.fn()
vi.mock('@/lib/auth/credentials', () => ({ confirmEmailChange: (...a: unknown[]) => confirmEmailChange(...a) }))
const redirect = vi.fn((path: string) => {
  throw new Error(`REDIRECT ${path}`)
})
vi.mock('next/navigation', () => ({ redirect: (p: string) => redirect(p) }))

const { confirmEmailChangeAction } = await import('./email-change')

const form = (token?: string) => {
  const f = new FormData()
  if (token !== undefined) f.set('token', token)
  return f
}

beforeEach(() => confirmEmailChange.mockReset())

describe('confirmEmailChangeAction (#236)', () => {
  it.each([
    ['changed', 'email-changed'],
    ['taken', 'email-taken'],
    ['expired', 'expired'],
    ['used', 'used'],
    ['invalid', 'invalid'],
  ])('sends a result of %s to the page that shows %s', async (result, status) => {
    confirmEmailChange.mockResolvedValue(result)
    await expect(confirmEmailChangeAction(form('tok'))).rejects.toThrow(`REDIRECT /verify-email?status=${status}`)
  })

  it('gives the token of the form to the change, and null when there is none', async () => {
    confirmEmailChange.mockResolvedValue('invalid')
    await expect(confirmEmailChangeAction(form('abc'))).rejects.toThrow('REDIRECT')
    expect(confirmEmailChange).toHaveBeenLastCalledWith('abc')
    await expect(confirmEmailChangeAction(form())).rejects.toThrow('REDIRECT')
    expect(confirmEmailChange).toHaveBeenLastCalledWith(null)
  })
})
