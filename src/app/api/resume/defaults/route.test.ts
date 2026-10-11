import { describe, it, expect, vi, beforeEach } from 'vitest'

const getResumeProfile = vi.fn()
const saveResumeProfile = vi.fn()
vi.mock('@/lib/data', () => ({
  getResumeProfile: (...a: unknown[]) => getResumeProfile(...a),
  saveResumeProfile: (...a: unknown[]) => saveResumeProfile(...a),
}))
vi.mock('@/lib/auth/session', () => ({ getSessionUserId: vi.fn().mockResolvedValue('u1') }))

const { GET, PUT } = await import('./route')

const profile = { full_name: 'Ada Lovelace', email: 'ada@example.test', linkedin: '', phone: '', address: '', resume_title: '', profile_text: 'Hello', ai_context: '' }
const put = (body: unknown, headers: Record<string, string> = { 'content-type': 'application/json' }) =>
  PUT(new Request('http://x', { method: 'PUT', body: typeof body === 'string' ? body : JSON.stringify(body), headers }))

beforeEach(() => {
  getResumeProfile.mockReset().mockResolvedValue(profile)
  saveResumeProfile.mockReset().mockImplementation(async (_user: string, p: unknown) => p)
})

describe('PUT /api/resume/defaults (#201, #220)', () => {
  it('saves the profile for the user of the session and returns it', async () => {
    const res = await put(profile)
    expect(res.status).toBe(200)
    expect(saveResumeProfile).toHaveBeenCalledWith('u1', profile)
    expect(await res.json()).toEqual(profile)
  })

  it('refuses a field over its limit and names it: the profile limits are the ones of the table', async () => {
    const res = await put({ ...profile, phone: '0'.repeat(51) })
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'Phone is too long: 50 characters at most.' })
    expect(saveResumeProfile).not.toHaveBeenCalled()
  })

  it('refuses an email that is not one, and accepts an empty one', async () => {
    expect((await put({ ...profile, email: 'not-an-email' })).status).toBe(400)
    expect((await put({ ...profile, email: '' })).status).toBe(200)
  })

  it('refuses a profile text over 5,000 characters', async () => {
    expect((await put({ ...profile, profile_text: 'a'.repeat(5001) })).status).toBe(400)
  })

  it('drops unknown keys, and fills a missing field with an empty one rather than failing', async () => {
    await put({ full_name: 'Ada', is_admin: true })
    const saved = saveResumeProfile.mock.calls[0][1]
    expect(saved).not.toHaveProperty('is_admin')
    expect(saved).toMatchObject({ full_name: 'Ada', email: '', profile_text: '' })
  })

  it('refuses the types an HTML form can send, and a body that is too big', async () => {
    expect((await put(JSON.stringify(profile), { 'content-type': 'text/plain' })).status).toBe(415)
    expect((await put({ ...profile, profile_text: 'a'.repeat(200 * 1024) })).status).toBe(413)
  })
})

describe('GET /api/resume/defaults', () => {
  it('reads the profile of the user of the session', async () => {
    const res = await GET()
    expect(await res.json()).toEqual(profile)
    expect(getResumeProfile).toHaveBeenCalledWith('u1')
  })
})
