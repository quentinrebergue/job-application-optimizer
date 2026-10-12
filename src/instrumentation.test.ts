import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const startMaintenance = vi.fn()
vi.mock('@/lib/maintenance', () => ({ startMaintenance: () => startMaintenance() }))

const { register } = await import('./instrumentation')

beforeEach(() => startMaintenance.mockReset())
afterEach(() => vi.unstubAllEnvs())

describe('register (#213)', () => {
  it('starts the cleanup on the Node.js server', async () => {
    vi.stubEnv('NEXT_RUNTIME', 'nodejs')
    await register()
    expect(startMaintenance).toHaveBeenCalledTimes(1)
  })

  it('does not start it on the Edge runtime, which has no database', async () => {
    vi.stubEnv('NEXT_RUNTIME', 'edge')
    await register()
    expect(startMaintenance).not.toHaveBeenCalled()
  })
})
