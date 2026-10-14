import { LIMITS } from '@/config/limits'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const getJob = vi.fn()
const getResumeConfig = vi.fn()
const saveResumeConfig = vi.fn()
vi.mock('@/lib/data', () => ({
  getJob: (...a: unknown[]) => getJob(...a),
  getResumeConfig: (...a: unknown[]) => getResumeConfig(...a),
  saveResumeConfig: (...a: unknown[]) => saveResumeConfig(...a),
}))
vi.mock('@/lib/auth/session', () => ({ getSessionUserId: vi.fn().mockResolvedValue('u1') }))

const { GET, PUT } = await import('./route')

const ctx = { params: Promise.resolve({ id: 'job-1' }) }
const config = { selected_entity_ids: ['exp-1'], ai_rankings: [], profile_text: 'Hello' }
const put = (body: unknown, headers: Record<string, string> = { 'content-type': 'application/json' }) =>
  PUT(new Request('http://x', { method: 'PUT', body: typeof body === 'string' ? body : JSON.stringify(body), headers }), ctx)

beforeEach(() => {
  getJob.mockReset().mockResolvedValue({ id: 'job-1' })
  getResumeConfig.mockReset().mockResolvedValue(config)
  saveResumeConfig.mockReset().mockResolvedValue(undefined)
})

describe('PUT /api/jobs/[id]/resume-config (#201, #220)', () => {
  it('saves the document for the user and the job, and returns what it saved', async () => {
    const res = await put(config)
    expect(res.status).toBe(200)
    expect(saveResumeConfig).toHaveBeenCalledWith('u1', 'job-1', config)
    expect(await res.json()).toEqual(config)
  })

  it('looks for the job of this user first: another user\'s job is a 404 and nothing is saved', async () => {
    getJob.mockResolvedValue(null)
    expect((await put(config)).status).toBe(404)
    expect(getJob).toHaveBeenCalledWith('u1', 'job-1')
    expect(saveResumeConfig).not.toHaveBeenCalled()
  })

  it('still saves a resume with an old AI score outside 0 to 1, instead of failing the whole save', async () => {
    const old = { ...config, ai_rankings: [{ entity_id: 'exp-1', score: 7 }] }
    expect((await put(old)).status).toBe(200)
    expect(saveResumeConfig.mock.calls[0][2].ai_rankings).toEqual([{ entity_id: 'exp-1', score: 7 }])
  })

  it('accepts a body up to 200 KB (a resume of 500 entries) and refuses more with 413', async () => {
    const big = { ...config, selected_entity_ids: Array.from({ length: 500 }, (_, i) => `exp-${String(i).padStart(90, '0')}`) }
    expect(JSON.stringify(big).length).toBeGreaterThan(40_000)
    expect((await put(big)).status).toBe(200)
    expect((await put({ ...config, profile_text: 'a'.repeat(210 * 1024) })).status).toBe(413)
  })

  it('refuses a text over its limit, naming the field', async () => {
    const res = await put({ ...config, profile_text: 'a'.repeat(LIMITS.profile.profile_text + 1) })
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: `Profile text is too long: ${LIMITS.profile.profile_text.toLocaleString('en-US')} characters at most.` })
    expect(saveResumeConfig).not.toHaveBeenCalled()
  })

  it('refuses a custom description over its limit and too many ids', async () => {
    expect((await put({ ...config, entity_description_overrides: { 'exp-1': 'a'.repeat(LIMITS.resume.entityDescription + 1) } })).status).toBe(400)
    expect((await put({ ...config, selected_entity_ids: Array(501).fill('x') })).status).toBe(400)
  })

  it('drops unknown keys, so nothing the app does not know is written to the database', async () => {
    await put({ ...config, admin: true, user_id: 'someone-else' })
    expect(saveResumeConfig.mock.calls[0][2]).not.toHaveProperty('admin')
    expect(saveResumeConfig.mock.calls[0][2]).not.toHaveProperty('user_id')
  })

  it('refuses the types an HTML form can send', async () => {
    expect((await put(JSON.stringify(config), { 'content-type': 'text/plain' })).status).toBe(415)
  })
})

describe('GET /api/jobs/[id]/resume-config', () => {
  it('answers 404 for a job that is not the user\'s, and the config otherwise', async () => {
    getJob.mockResolvedValue(null)
    expect((await GET(new Request('http://x'), ctx)).status).toBe(404)
    getJob.mockResolvedValue({ id: 'job-1' })
    const res = await GET(new Request('http://x'), ctx)
    expect(await res.json()).toEqual(config)
    expect(getResumeConfig).toHaveBeenCalledWith('u1', 'job-1')
  })
})
