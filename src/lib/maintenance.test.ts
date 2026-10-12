import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const query = vi.fn()
vi.mock('@/lib/db', () => ({ pool: { query: (...a: unknown[]) => query(...a) } }))

const { purgeExpiredData, startMaintenance, stopMaintenance } = await import('./maintenance')

beforeEach(() => {
  vi.useFakeTimers()
  query.mockReset().mockResolvedValue({ rowCount: 0, rows: [] })
  vi.spyOn(console, 'info').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  stopMaintenance()
  vi.useRealTimers()
})

describe('purgeExpiredData', () => {
  it('cleans the five places, in order, and says how many rows went from each', async () => {
    query.mockResolvedValueOnce({ rowCount: 3 }).mockResolvedValueOnce({ rowCount: 2 }).mockResolvedValueOnce({ rowCount: 1 })
      .mockResolvedValueOnce({ rowCount: 4 }).mockResolvedValueOnce({ rows: [{ deleted: 5, months: 1 }] })
    expect(await purgeExpiredData(new Date('2026-10-12T12:00:00Z'))).toEqual({ rate_limits: 3, login_attempts: 2, sessions: 1, email_tokens: 4, ai_usage: 5 })
    const sql = query.mock.calls.map((c) => c[0] as string)
    expect(sql[0]).toContain('DELETE FROM rate_limits')
    expect(sql[1]).toContain('DELETE FROM login_attempts')
    expect(sql[2]).toContain('DELETE FROM sessions')
    expect(sql[3]).toContain('DELETE FROM email_tokens')
    expect(sql[4]).toContain('DELETE FROM ai_usage')
    expect(sql[4]).toContain('INSERT INTO ai_usage_monthly')
  })

  it('keeps the months the privacy page says: the current one and the previous one', async () => {
    await purgeExpiredData(new Date('2026-10-12T12:00:00Z'))
    const ai = query.mock.calls.find((c) => (c[0] as string).includes('ai_usage'))!
    // Two months kept: the cut is the start of the month before the current one.
    expect(ai[1][1]).toBe(1)
  })

  it('says 0 for the AI calls when the statement answers nothing', async () => {
    query.mockResolvedValue({ rowCount: 0, rows: [] })
    expect((await purgeExpiredData(new Date('2026-10-12T12:00:00Z'))).ai_usage).toBe(0)
  })
})

describe('startMaintenance', () => {
  it('cleans a minute after the start, then every ten minutes', async () => {
    startMaintenance()
    expect(query).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(60_000)
    expect(query).toHaveBeenCalledTimes(5)
    await vi.advanceTimersByTimeAsync(10 * 60_000)
    expect(query.mock.calls.length).toBeGreaterThanOrEqual(10)
  })

  it('starts one timer however many times it is called (a hot reload in development)', async () => {
    startMaintenance()
    startMaintenance()
    startMaintenance()
    await vi.advanceTimersByTimeAsync(60_000)
    expect(query).toHaveBeenCalledTimes(5)
  })

  it('logs a failure and tries again at the next pass, instead of stopping', async () => {
    query.mockRejectedValueOnce(new Error('database down'))
    startMaintenance({ everyMs: 1000, firstAfterMs: 500 })
    await vi.advanceTimersByTimeAsync(500)
    expect(console.error).toHaveBeenCalledWith('maintenance: the cleanup failed', expect.any(Error))
    await vi.advanceTimersByTimeAsync(1000)
    expect(query.mock.calls.length).toBeGreaterThan(1)
  })

  it('says what it deleted, and stays silent when there was nothing', async () => {
    startMaintenance({ everyMs: 1_000_000, firstAfterMs: 100 })
    await vi.advanceTimersByTimeAsync(100)
    expect(console.info).not.toHaveBeenCalled()
    stopMaintenance()
    query.mockResolvedValue({ rowCount: 2, rows: [{ deleted: 0 }] })
    startMaintenance({ everyMs: 1_000_000, firstAfterMs: 100 })
    await vi.advanceTimersByTimeAsync(100)
    expect(console.info).toHaveBeenCalledWith('maintenance: expired data deleted', expect.objectContaining({ rate_limits: 2 }))
  })
})
