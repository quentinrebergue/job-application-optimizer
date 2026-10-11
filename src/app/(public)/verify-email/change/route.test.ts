import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const confirmEmailChange = vi.fn()
vi.mock('@/lib/auth/credentials', () => ({ confirmEmailChange: (...a: unknown[]) => confirmEmailChange(...a) }))
vi.mock('@/lib/email/providers', () => ({ appUrl: () => 'https://fastresume.tech' }))

const { GET } = await import('./route')

const open = (query = '?token=tok') => GET(new NextRequest(`https://fastresume.tech/verify-email/change${query}`))

beforeEach(() => confirmEmailChange.mockReset())

describe('GET /verify-email/change (#236)', () => {
  it.each([
    ['changed', 'email-changed'],
    ['taken', 'email-taken'],
    ['expired', 'expired'],
    ['used', 'used'],
    ['invalid', 'invalid'],
  ])('sends a result of %s to the page that shows %s, with the token gone from the address', async (result, status) => {
    confirmEmailChange.mockResolvedValue(result)
    const res = await open()
    expect(res.headers.get('location')).toBe(`https://fastresume.tech/verify-email?status=${status}`)
  })

  it('gives the token to the check as it came', async () => {
    confirmEmailChange.mockResolvedValue('changed')
    await open('?token=abc')
    expect(confirmEmailChange).toHaveBeenCalledWith('abc')
  })
})
