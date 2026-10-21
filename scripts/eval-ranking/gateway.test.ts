import { describe, it, expect } from 'vitest'
import { gatewayEnvironment, waitUntil } from './gateway'

describe('gatewayEnvironment', () => {
  it('gives the gateway the environment of the evaluation, its own address and the model asked for', () => {
    const env = gatewayEnvironment({ AI_TOKEN: 'k', AI_BASE_URL: 'https://p/v1', PATH: '/bin', AI_MODEL: 'old' }, 5123, 'mistral-small-2603')
    expect(env).toMatchObject({ AI_TOKEN: 'k', AI_BASE_URL: 'https://p/v1', PATH: '/bin', ADDR: '127.0.0.1:5123', AI_MODEL: 'mistral-small-2603' })
  })

  it('keeps the model of the environment when none is asked for, and never sends undefined values', () => {
    const env = gatewayEnvironment({ AI_TOKEN: 'k', AI_MODEL: 'kept', X: undefined }, 1)
    expect(env.AI_MODEL).toBe('kept')
    expect('X' in env).toBe(false)
  })

  it('explains what is missing when there is no key', () => {
    expect(() => gatewayEnvironment({}, 1)).toThrow(/AI_TOKEN/)
  })
})

describe('waitUntil', () => {
  const fast = { timeoutMs: 200, intervalMs: 5 }

  it('returns once the check is true, after a few tries, errors of the check included', async () => {
    let calls = 0
    await waitUntil(async () => { if (++calls < 3) throw new Error('not yet'); return true }, fast)
    expect(calls).toBe(3)
  })

  it('stops with an error when the time is up', async () => {
    await expect(waitUntil(async () => false, { timeoutMs: 30, intervalMs: 5 })).rejects.toThrow(/not ready after/)
  })

  it('stops at once, with its reason, when the process is gone', async () => {
    let calls = 0
    await expect(waitUntil(async () => { calls++; return false }, { ...fast, failed: () => 'the gateway stopped (code 1): bad key' })).rejects.toThrow('bad key')
    expect(calls).toBe(0)
  })
})
