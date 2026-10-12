// The hashing of passwords goes through the limiter of concurrency (#225): bcryptjs runs on the main thread of
// Node, so too many checks at once freeze the whole application. bcryptjs is replaced by a slow stand-in that notes
// how many calls run at the same time (the real one is tested in password.test.ts).
import { describe, it, expect, vi } from 'vitest'

const probe = vi.hoisted(() => ({ running: 0, peak: 0 }))
vi.mock('bcryptjs', () => {
  const slow = async <T,>(value: T): Promise<T> => {
    probe.running++
    probe.peak = Math.max(probe.peak, probe.running)
    await new Promise((resolve) => setTimeout(resolve, 5))
    probe.running--
    return value
  }
  return {
    default: {
      hash: () => slow('hash'),
      compare: () => slow(true),
      getRounds: () => 12,
    },
  }
})

const { hashPassword, verifyPassword, UNKNOWN_ACCOUNT_HASH } = await import('./password')

describe('hashing goes through the limiter (#225)', () => {
  it('checks at most 2 passwords at once, however many are asked at the same time', async () => {
    const results = await Promise.all(Array.from({ length: 30 }, () => verifyPassword('x', UNKNOWN_ACCOUNT_HASH)))
    expect(results).toHaveLength(30)
    expect(probe.peak).toBe(2)
  })

  it('shares the same two places between checks and hashes: they cannot add up', async () => {
    probe.peak = 0
    await Promise.all([
      ...Array.from({ length: 15 }, () => verifyPassword('x', UNKNOWN_ACCOUNT_HASH)),
      ...Array.from({ length: 15 }, () => hashPassword('x')),
    ])
    expect(probe.peak).toBe(2)
  })
})
