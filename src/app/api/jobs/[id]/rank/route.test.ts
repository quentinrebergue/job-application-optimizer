import { describe, it, expect, vi, beforeEach } from 'vitest'

const getJob = vi.fn()
const updateJob = vi.fn()
vi.mock('@/lib/data', () => ({
  getJob: (...a: unknown[]) => getJob(...a),
  updateJob: (...a: unknown[]) => updateJob(...a),
  getResumeProfile: vi.fn().mockResolvedValue({ ai_context: '' }),
  listEntities: vi.fn().mockResolvedValue([]),
}))
const rankJobWithAI = vi.fn()
vi.mock('@/lib/ai', () => ({ rankJobWithAI: (...a: unknown[]) => rankJobWithAI(...a) }))
const findUserById = vi.fn()
vi.mock('@/lib/data/users', () => ({ findUserById: (...a: unknown[]) => findUserById(...a) }))
const reserveAiCall = vi.fn()
const settleAiCall = vi.fn()
vi.mock('@/lib/ai/usage', () => ({
  reserveAiCall: (...a: unknown[]) => reserveAiCall(...a),
  settleAiCall: (...a: unknown[]) => settleAiCall(...a),
}))
const getSessionUserId = vi.fn()
vi.mock('@/lib/auth/session', () => ({ getSessionUserId: () => getSessionUserId() }))

const { DELETE, POST } = await import('./route')

const { AiGatewayError } = await import('@/lib/ai/gateway')

const ctx = { params: Promise.resolve({ id: 'job-1' }) }

beforeEach(() => {
  getJob.mockReset().mockResolvedValue({ id: 'job-1', ats_tags: ['go'], ai_analysis: { job_id: 'job-1' } })
  updateJob.mockReset().mockResolvedValue({})
  getSessionUserId.mockReset().mockResolvedValue('u1')
})

describe('DELETE /api/jobs/[id]/rank', () => {
  it('clears the ranking in the database, not in a file (#167)', async () => {
    const res = await DELETE(new Request('http://x'), ctx)
    expect(res.status).toBe(200)
    expect(updateJob).toHaveBeenCalledWith('u1', 'job-1', { ai_analysis: undefined, ats_tags: [] })
  })

  it('answers 404 for a job that is not the user\'s', async () => {
    getJob.mockResolvedValue(null)
    const res = await DELETE(new Request('http://x'), ctx)
    expect(res.status).toBe(404)
    expect(updateJob).not.toHaveBeenCalled()
  })

  it('answers 401 without a session', async () => {
    getSessionUserId.mockResolvedValue(null)
    expect((await DELETE(new Request('http://x'), ctx)).status).toBe(401)
  })
})

describe('POST /api/jobs/[id]/rank', () => {
  const post = () => POST(new Request('http://x', { method: 'POST' }), ctx)

  beforeEach(() => {
    findUserById.mockReset().mockResolvedValue({ emailVerified: true })
    rankJobWithAI.mockReset().mockResolvedValue({
      analysis: { job_id: '', ats_tags: ['go'], summary: 'ok' },
      usage: { prompt_tokens: 2690, completion_tokens: 450 },
      model: 'mistral-small-2603',
    })
    reserveAiCall.mockReset().mockResolvedValue({ id: 7 })
    settleAiCall.mockReset().mockResolvedValue(undefined)
    getJob.mockResolvedValue({ id: 'job-1', title: 'Dev', company: 'Acme', description: 'd', resume_config: {} })
  })

  it('ranks through the gateway for this user and saves the result', async () => {
    const res = await post()
    expect(res.status).toBe(200)
    expect(rankJobWithAI.mock.calls[0][0]).toBe('u1')
    expect(updateJob).toHaveBeenCalledWith('u1', 'job-1', expect.objectContaining({ ats_tags: ['go'], ai_analysis: expect.objectContaining({ job_id: 'job-1' }) }))
  })

  it('refuses an unconfirmed account before calling the AI', async () => {
    findUserById.mockResolvedValue({ emailVerified: false })
    expect((await post()).status).toBe(403)
    expect(rankJobWithAI).not.toHaveBeenCalled()
  })

  it('passes a gateway failure on with its status and message', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    rankJobWithAI.mockRejectedValue(new AiGatewayError('Daily limit reached.', 429))
    const res = await post()
    expect(res.status).toBe(429)
    expect(await res.json()).toEqual({ error: 'Daily limit reached.' })
    expect(updateJob).not.toHaveBeenCalled()
  })

  describe('the limits and the accounting (#203)', () => {
    it('writes the call down before asking the AI and settles it with the real tokens and model', async () => {
      await post()
      expect(reserveAiCall).toHaveBeenCalledWith('u1', 'rank')
      expect(reserveAiCall.mock.invocationCallOrder[0]).toBeLessThan(rankJobWithAI.mock.invocationCallOrder[0])
      expect(settleAiCall).toHaveBeenCalledWith({ id: 7 }, { status: 'done', model: 'mistral-small-2603', promptTokens: 2690, completionTokens: 450 })
    })

    it('answers 429 with the wait when the user is over a limit, without calling the AI', async () => {
      reserveAiCall.mockResolvedValue({ denied: true, status: 429, code: 'ai_user_limit', message: 'You have used the AI 20 times this day. Try again in 3 hours.', retryAfterSeconds: 10800 })
      const res = await post()
      expect(res.status).toBe(429)
      expect(res.headers.get('Retry-After')).toBe('10800')
      expect(await res.json()).toEqual({ error: 'You have used the AI 20 times this day. Try again in 3 hours.', code: 'ai_user_limit' })
      expect(rankJobWithAI).not.toHaveBeenCalled()
      expect(settleAiCall).not.toHaveBeenCalled()
    })

    it('answers 503 when the site has spent its month, for everyone', async () => {
      reserveAiCall.mockResolvedValue({ denied: true, status: 503, code: 'ai_monthly_cap', message: 'The AI is paused until next month.', retryAfterSeconds: 86400 })
      const res = await post()
      expect(res.status).toBe(503)
      expect(await res.json()).toMatchObject({ code: 'ai_monthly_cap' })
      expect(rankJobWithAI).not.toHaveBeenCalled()
    })

    it('refuses a prompt that is too long with what to cut, before reserving anything (#185)', async () => {
      getJob.mockResolvedValue({ id: 'job-1', title: 'Dev', company: 'Acme', description: 'x'.repeat(70_000) })
      const res = await post()
      expect(res.status).toBe(413)
      const body = await res.json()
      expect(body.code).toBe('prompt_too_large')
      expect(body.error).toContain('too long for the AI to read in one go')
      expect(body.error).toContain('Shorten the offer')
      expect(reserveAiCall).not.toHaveBeenCalled()
      expect(rankJobWithAI).not.toHaveBeenCalled()
    })

    it('does not reserve for a job that is not the user\'s', async () => {
      getJob.mockResolvedValue(null)
      expect((await post()).status).toBe(404)
      expect(reserveAiCall).not.toHaveBeenCalled()
    })

    it('settles a timeout as a counted failure', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
      rankJobWithAI.mockRejectedValue(new AiGatewayError('The AI took too long to answer. Try again.', 504))
      await post()
      expect(settleAiCall).toHaveBeenCalledWith({ id: 7 }, { status: 'failed', timedOut: true })
    })

    it('does not count a provider outage against the user', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
      rankJobWithAI.mockRejectedValue(new AiGatewayError('The AI is unavailable right now.', 502, { code: 'ai_unavailable' }))
      await post()
      expect(settleAiCall).toHaveBeenCalledWith({ id: 7 }, { status: 'released' })
    })

    it('does not count a call the kill switch refused', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
      rankJobWithAI.mockRejectedValue(new AiGatewayError('The AI is paused for now. Try again later.', 503, { code: 'ai_disabled' }))
      const res = await post()
      expect(res.status).toBe(503)
      expect(settleAiCall).toHaveBeenCalledWith({ id: 7 }, { status: 'released' })
    })
  })
})
