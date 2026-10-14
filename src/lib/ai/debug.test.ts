import { describe, it, expect, vi, afterEach } from 'vitest'
import { debugEnabled, debugExchange } from './debug'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('AI debug output', () => {
  it('is off by default, in tests and in production, even when asked for', () => {
    expect(debugEnabled()).toBe(false)
    vi.stubEnv('AI_DEBUG', '1')
    expect(debugEnabled()).toBe(false) // NODE_ENV is "test"
    vi.stubEnv('NODE_ENV', 'production')
    expect(debugEnabled()).toBe(false)
  })

  it('is on only in development and only when asked for', () => {
    vi.stubEnv('NODE_ENV', 'development')
    expect(debugEnabled()).toBe(false)
    vi.stubEnv('AI_DEBUG', '1')
    expect(debugEnabled()).toBe(true)
  })

  it('prints nothing when it is off, and the whole exchange when it is on', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    debugExchange('import', { prompt: 'SECRET LINE' })
    expect(log).not.toHaveBeenCalled()

    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('AI_DEBUG', '1')
    debugExchange('import', { prompt: 'a numbered line', answer: { experiences: [] } })
    const printed = String(log.mock.calls[0][0])
    expect(printed).toContain('AI debug: import')
    expect(printed).toContain('a numbered line')
    expect(printed).toContain('"experiences": []')
  })
})
