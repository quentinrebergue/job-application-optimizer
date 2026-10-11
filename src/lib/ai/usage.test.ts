import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

type Call = { sql: string; params: unknown[] }
const calls: Call[] = []
let spent = '0'
let mine: Date[] = []
let lastModel: string | undefined
const inserted = 41

const client = {
  query: vi.fn(async (sql: string, params: unknown[] = []) => {
    calls.push({ sql, params })
    if (sql.includes('FROM ai_usage WHERE status')) return { rows: lastModel ? [{ model: lastModel }] : [] }
    if (sql.includes('FROM ai_usage WHERE created_at')) return { rows: [{ eur: spent }] }
    if (sql.includes('FROM ai_usage WHERE user_id')) return { rows: mine.map((created_at) => ({ created_at })) }
    if (sql.includes('INSERT INTO ai_usage')) return { rows: [{ id: String(inserted) }] }
    return { rows: [] }
  }),
  release: vi.fn(),
}
const poolQuery = vi.fn()
vi.mock('@/lib/db', () => ({ pool: { connect: async () => client, query: (...a: unknown[]) => poolQuery(...a) } }))

const { reserveAiCall, settleAiCall, worstCaseCost, timeoutCost } = await import('./usage')

const NOW = new Date('2026-10-15T12:00:00Z')
const ago = (ms: number) => new Date(NOW.getTime() - ms)
const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR
const sqls = () => calls.map((c) => c.sql.trim().split(/\s+/)[0])

beforeEach(() => {
  calls.length = 0
  spent = '0'
  mine = []
  lastModel = undefined
  client.release.mockClear()
  poolQuery.mockReset().mockResolvedValue({ rows: [{ eur: '0' }] })
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => vi.unstubAllEnvs())

describe('worst case', () => {
  it('prices the biggest prompt and answer at the dearest model when none is known', () => {
    // 30000 chars / 2 = 15000 tokens at 1.28 + 2000 tokens at 6.38, per million
    expect(worstCaseCost()).toBeCloseTo(0.0192 + 0.01276, 5)
    expect(timeoutCost()).toBeCloseTo(0.0192, 5)
    expect(worstCaseCost('some-new-model')).toBeCloseTo(0.0192 + 0.01276, 5)
  })

  it('prices it at the model that is used, so Small does not pay for Medium', () => {
    // 15000 tokens at 0.13 + 2000 tokens at 0.51, per million
    expect(worstCaseCost('mistral-small-2603')).toBeCloseTo(0.00195 + 0.00102, 6)
    expect(timeoutCost('mistral-small-2603')).toBeCloseTo(0.00195, 6)
    expect(worstCaseCost('mistral-medium-2604')).toBeGreaterThan(worstCaseCost('mistral-small-2603') * 10)
  })
})

describe('reserveAiCall', () => {
  it('writes the call down, under the lock, when nothing is over', async () => {
    const result = await reserveAiCall('u1', 'rank', NOW)
    expect(result).toEqual({ id: 41, model: undefined })
    expect(sqls()).toEqual(['BEGIN', 'SELECT', 'SELECT', 'SELECT', 'SELECT', 'INSERT', 'COMMIT'])
    expect(calls[1].sql).toContain('pg_advisory_xact_lock')
    expect(client.release).toHaveBeenCalled()
    const insert = calls.find((c) => c.sql.includes('INSERT'))!
    expect(insert.params[0]).toBe('u1')
    expect(insert.params[2]).toBeCloseTo(worstCaseCost(), 6)
  })

  it('reserves at the price of the model that answered last, and remembers which', async () => {
    lastModel = 'mistral-small-2603'
    const result = await reserveAiCall('u1', 'rank', NOW)
    expect(result).toEqual({ id: 41, model: 'mistral-small-2603' })
    const insert = calls.find((c) => c.sql.includes('INSERT'))!
    expect(insert.params[2]).toBeCloseTo(worstCaseCost('mistral-small-2603'), 6)
    expect(insert.params[2]).toBeLessThan(0.004)
  })

  it('refuses at the hourly limit and says when the oldest call leaves the hour', async () => {
    mine = Array.from({ length: 10 }, (_, i) => ago(50 * MIN - i * MIN))
    const result = await reserveAiCall('u1', 'rank', NOW)
    expect(result).toMatchObject({ denied: true, status: 429, code: 'ai_user_limit' })
    // the oldest (50 min ago) leaves the hour in 10 minutes
    expect(result).toMatchObject({ retryAfterSeconds: 600, message: 'You have used the AI 10 times this hour. Try again in 10 minutes.' })
    expect(sqls()).not.toContain('COMMIT')
    expect(calls.some((c) => c.sql.includes('INSERT'))).toBe(false)
  })

  it('lets the tenth call through and refuses the eleventh in the hour', async () => {
    mine = Array.from({ length: 9 }, (_, i) => ago((i + 1) * MIN))
    expect(await reserveAiCall('u1', 'rank', NOW)).toEqual({ id: 41, model: undefined })
    mine = Array.from({ length: 10 }, (_, i) => ago((i + 1) * MIN))
    expect(await reserveAiCall('u1', 'rank', NOW)).toMatchObject({ denied: true })
  })

  it('refuses at the daily limit even when the hour is free', async () => {
    mine = Array.from({ length: 20 }, (_, i) => ago(2 * HOUR + i * HOUR / 2))
    const result = await reserveAiCall('u1', 'rank', NOW)
    expect(result).toMatchObject({ denied: true, code: 'ai_user_limit', message: expect.stringContaining('20 times this day') })
  })

  it('refuses at the weekly limit', async () => {
    mine = Array.from({ length: 50 }, (_, i) => ago(2 * DAY + i * HOUR))
    const result = await reserveAiCall('u1', 'rank', NOW)
    expect(result).toMatchObject({ denied: true, message: expect.stringContaining('50 times this week') })
  })

  it('makes the user wait for the longest of the windows that are over', async () => {
    // 10 calls in the last hour, and 20 in the day: the day is the longer wait
    mine = [
      ...Array.from({ length: 10 }, (_, i) => ago(30 * MIN + i * MIN)),
      ...Array.from({ length: 10 }, (_, i) => ago(5 * HOUR + i * HOUR)),
    ]
    const result = await reserveAiCall('u1', 'rank', NOW)
    expect(result).toMatchObject({ denied: true, message: expect.stringContaining('this day') })
  })

  it('pauses the AI for everyone once the month is spent, with the time to the next month', async () => {
    spent = '2.99'
    const result = await reserveAiCall('u1', 'rank', NOW)
    expect(result).toMatchObject({ denied: true, status: 503, code: 'ai_monthly_cap', message: 'The AI is paused until next month.' })
    // from 15 Oct 12:00 to 1 Nov 00:00 UTC: 16 days and 12 hours
    expect(result).toMatchObject({ retryAfterSeconds: (16 * 24 + 12) * 3600 })
  })

  it('counts the pending calls in the spending, so parallel calls cannot slip under the cap', async () => {
    // At the dearest price (no call made yet): 2.98 spent + 0.032 reserved is over 3; 2.90 + 0.032 is not
    spent = '2.98'
    expect(await reserveAiCall('u1', 'rank', NOW)).toMatchObject({ denied: true, code: 'ai_monthly_cap' })
    spent = '2.90'
    expect(await reserveAiCall('u1', 'rank', NOW)).toEqual({ id: 41, model: undefined })
  })

  it('reads the spending from the start of the month, UTC', async () => {
    await reserveAiCall('u1', 'rank', NOW)
    const spendQuery = calls.find((c) => c.sql.includes('FROM ai_usage WHERE created_at'))!
    expect(spendQuery.params[0]).toEqual(new Date('2026-10-01T00:00:00Z'))
  })

  it('takes the limits from the environment', async () => {
    vi.stubEnv('AI_PER_HOUR', '2')
    mine = [ago(10 * MIN), ago(20 * MIN)]
    expect(await reserveAiCall('u1', 'rank', NOW)).toMatchObject({ denied: true, message: expect.stringContaining('2 times this hour') })
  })

  it('rolls back and releases the connection when the database fails', async () => {
    client.query.mockImplementationOnce(async () => { throw new Error('db down') })
    await expect(reserveAiCall('u1', 'rank', NOW)).rejects.toThrow('db down')
    expect(client.release).toHaveBeenCalled()
  })
})

describe('settleAiCall', () => {
  it('writes the real tokens, the model and the cost of a done call', async () => {
    await settleAiCall({ id: 7 }, { status: 'done', model: 'mistral-small-2603', promptTokens: 2690, completionTokens: 450 }, NOW)
    const update = poolQuery.mock.calls[0]
    expect(update[1].slice(0, 4)).toEqual([7, 'mistral-small-2603', 2690, 450])
    expect(update[1][4]).toBeCloseTo((2690 * 0.13 + 450 * 0.51) / 1e6, 8)
  })

  it('takes a model without a price at the dearest one, not at nothing', async () => {
    await settleAiCall({ id: 7 }, { status: 'done', model: 'some-new-model', promptTokens: 1_000_000, completionTokens: 0 }, NOW)
    expect(poolQuery.mock.calls[0][1][4]).toBeCloseTo(1.28)
    expect(console.warn).toHaveBeenCalled()
  })

  it('costs nothing for a failed call, and the prompt for a timeout, at the price it was reserved with', async () => {
    await settleAiCall({ id: 7 }, { status: 'failed', timedOut: false }, NOW)
    expect(poolQuery.mock.calls[0][1]).toEqual([7, 'failed', 0])
    await settleAiCall({ id: 8, model: 'mistral-small-2603' }, { status: 'failed', timedOut: true }, NOW)
    expect(poolQuery.mock.calls[1][1][2]).toBeCloseTo(timeoutCost('mistral-small-2603'), 8)
    await settleAiCall({ id: 9 }, { status: 'failed', timedOut: true }, NOW)
    expect(poolQuery.mock.calls[2][1][2]).toBeCloseTo(timeoutCost(), 8)
  })

  it('removes a released call: it is counted nowhere', async () => {
    await settleAiCall({ id: 7 }, { status: 'released' }, NOW)
    expect(poolQuery.mock.calls[0][0]).toContain('DELETE FROM ai_usage')
  })

  it('warns once, when the month reaches 80% of the cap', async () => {
    poolQuery.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{ eur: '2.4005' }] })
    await settleAiCall({ id: 7 }, { status: 'done', model: 'mistral-small-2603', promptTokens: 2690, completionTokens: 450 }, NOW)
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('80% of the monthly cap'), expect.anything())
  })

  it('does not warn again once past 80%', async () => {
    poolQuery.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{ eur: '2.80' }] })
    await settleAiCall({ id: 7 }, { status: 'done', model: 'mistral-small-2603', promptTokens: 2690, completionTokens: 450 }, NOW)
    expect(console.warn).not.toHaveBeenCalled()
  })

  it('never throws: the answer to the user matters more than the book-keeping', async () => {
    poolQuery.mockRejectedValue(new Error('db down'))
    await expect(settleAiCall({ id: 7 }, { status: 'failed', timedOut: false }, NOW)).resolves.toBeUndefined()
    expect(console.error).toHaveBeenCalled()
  })
})
