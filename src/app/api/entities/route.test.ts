import { describe, it, expect, vi, beforeEach } from 'vitest'

const createEntity = vi.fn()
const countEntities = vi.fn()
vi.mock('@/lib/data', () => ({ listEntities: vi.fn(), createEntity: (...a: unknown[]) => createEntity(...a), countEntities: (...a: unknown[]) => countEntities(...a) }))
const consumeRateLimit = vi.fn()
vi.mock('@/lib/rate-limit', () => ({ consumeRateLimit: (...a: unknown[]) => consumeRateLimit(...a) }))
vi.mock('@/lib/auth/session', () => ({ getSessionUserId: vi.fn().mockResolvedValue('u1') }))

const { POST } = await import('./route')

const send = (body: unknown) => POST(new Request('http://x', { method: 'POST', body: JSON.stringify(body) }))

beforeEach(() => {
  createEntity.mockReset().mockResolvedValue({ id: 'proj-1', type: 'projects' })
  countEntities.mockReset().mockResolvedValue(0)
  consumeRateLimit.mockReset().mockResolvedValue({ allowed: true, retryAfterMs: 0 })
})

describe('POST /api/entities', () => {
  it('saves an entry of the kind sent, without the kind in its data', async () => {
    const res = await send({ type: 'projects', title: 'Queue', description: 'd', tech: ['Go'], tags: ['Go'] })
    expect(res.status).toBe(201)
    expect(createEntity).toHaveBeenCalledWith('u1', 'projects', { title: 'Queue', description: 'd', tech: ['Go'], tags: ['Go'] })
  })

  it('refuses an unknown kind and a missing title', async () => {
    expect((await send({ type: 'hobbies', title: 'x' })).status).toBe(400)
    expect((await send({ type: 'projects' })).status).toBe(400)
    expect(createEntity).not.toHaveBeenCalled()
  })

  it('refuses a description over the limit and says so (#201)', async () => {
    const res = await send({ type: 'projects', title: 'Queue', description: 'a'.repeat(1001) })
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'Description is too long: 1,000 characters at most.' })
    expect(createEntity).not.toHaveBeenCalled()
  })

  it('refuses too many tags', async () => {
    const tags = Array.from({ length: 31 }, (_, i) => `t${i}`)
    const res = await send({ type: 'skills', name: 'N', category: 'C', tags })
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'Tags has too many items: 30 at most.' })
  })
})

describe('POST /api/entities: how many and how fast (#202)', () => {
  const project = { type: 'projects', title: 'Queue' }

  it('refuses an entry when the user has the maximum of that kind, and says which', async () => {
    countEntities.mockResolvedValue(20)
    const res = await send(project)
    expect(res.status).toBe(403)
    expect(await res.json()).toMatchObject({ code: 'limit_reached', error: 'You have reached the limit of 20 projects. Delete one to add another.' })
    expect(countEntities).toHaveBeenCalledWith('u1', 'projects')
    expect(createEntity).not.toHaveBeenCalled()
  })

  it('has a different maximum for each kind (the AI prompt must hold them all, #185)', async () => {
    countEntities.mockResolvedValue(10)
    expect((await send({ type: 'skills', name: 'N', category: 'C' })).status).toBe(403)
    expect((await send({ type: 'education', degree: 'D', institution: 'I' })).status).toBe(403)
    expect((await send({ type: 'experiences', title: 'T', company: 'C' })).status).toBe(403)
    expect((await send({ type: 'projects', title: 'T' })).status).toBe(201)
    countEntities.mockResolvedValue(20)
    expect((await send({ type: 'projects', title: 'T' })).status).toBe(403)
  })

  it('counts creations per hour and per day, whatever the kind', async () => {
    await send(project)
    await send({ type: 'skills', name: 'N', category: 'C' })
    expect(consumeRateLimit.mock.calls.map((c) => c[0])).toEqual([
      'create:entity:u1:hour', 'create:entity:u1:day', 'create:entity:u1:hour', 'create:entity:u1:day',
    ])
  })

  it('answers 429 once the hour is over, and creates nothing', async () => {
    consumeRateLimit.mockResolvedValueOnce({ allowed: false, retryAfterMs: 90 * 60_000 })
    const res = await send(project)
    expect(res.status).toBe(429)
    expect(await res.json()).toMatchObject({ error: 'Too many entries in a short time (30 per hour). Try again in about 2 hours.' })
    expect(createEntity).not.toHaveBeenCalled()
  })
})
