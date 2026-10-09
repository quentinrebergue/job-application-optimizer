import { describe, it, expect, vi, beforeEach } from 'vitest'

const createEntity = vi.fn()
vi.mock('@/lib/data', () => ({ listEntities: vi.fn(), createEntity: (...a: unknown[]) => createEntity(...a) }))
vi.mock('@/lib/auth/session', () => ({ getSessionUserId: vi.fn().mockResolvedValue('u1') }))

const { POST } = await import('./route')

const send = (body: unknown) => POST(new Request('http://x', { method: 'POST', body: JSON.stringify(body) }))

beforeEach(() => createEntity.mockReset().mockResolvedValue({ id: 'proj-1', type: 'projects' }))

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
    const res = await send({ type: 'projects', title: 'Queue', description: 'a'.repeat(5001) })
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'Description is too long: 5,000 characters at most.' })
    expect(createEntity).not.toHaveBeenCalled()
  })

  it('refuses too many tags', async () => {
    const tags = Array.from({ length: 31 }, (_, i) => `t${i}`)
    const res = await send({ type: 'skills', name: 'N', category: 'C', tags })
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'Tags has too many items: 30 at most.' })
  })
})
