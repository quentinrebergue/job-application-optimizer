import { describe, it, expect, vi, beforeEach } from 'vitest'

const getEntity = vi.fn()
const updateEntity = vi.fn()
const deleteEntity = vi.fn()
vi.mock('@/lib/data', () => ({
  getEntity: (...a: unknown[]) => getEntity(...a),
  updateEntity: (...a: unknown[]) => updateEntity(...a),
  deleteEntity: (...a: unknown[]) => deleteEntity(...a),
}))
vi.mock('@/lib/auth/session', () => ({ getSessionUserId: vi.fn().mockResolvedValue('u1') }))

const { GET, PUT, DELETE } = await import('./route')

const ctx = (type: string, id = 'proj-1') => ({ params: Promise.resolve({ type, id }) })
const put = (type: string, body: unknown, headers: Record<string, string> = { 'content-type': 'application/json' }) =>
  PUT(new Request('http://x', { method: 'PUT', body: typeof body === 'string' ? body : JSON.stringify(body), headers }), ctx(type))

beforeEach(() => {
  getEntity.mockReset().mockResolvedValue({ id: 'proj-1', type: 'projects' })
  updateEntity.mockReset().mockResolvedValue({ id: 'proj-1', type: 'projects' })
  deleteEntity.mockReset().mockResolvedValue(true)
})

describe('PUT /api/entities/[type]/[id] (#201, #220)', () => {
  it('takes only the field that was sent: the autosave saves one at a time', async () => {
    expect((await put('projects', { description: 'new text' })).status).toBe(200)
    expect(updateEntity).toHaveBeenCalledWith('u1', 'projects', 'proj-1', { description: 'new text' })
  })

  it('uses the schema of the kind in the URL, not another one', async () => {
    // a company is a field of an experience, not of a project: dropped, not saved
    await put('projects', { title: 'Queue', company: 'Acme' })
    expect(updateEntity.mock.calls[0][3]).toEqual({ title: 'Queue' })
    updateEntity.mockClear()
    await put('experiences', { title: 'Engineer', company: 'Acme' })
    expect(updateEntity.mock.calls[0][3]).toEqual({ title: 'Engineer', company: 'Acme' })
  })

  it('drops what a client must not write: the id, the owner, anything unknown', async () => {
    await put('projects', { title: 'Queue', id: 'proj-evil', type: 'skills', user_id: 'someone-else', secret: 1 })
    expect(updateEntity.mock.calls[0][3]).toEqual({ title: 'Queue' })
  })

  it('refuses a text over its limit and names the field and the limit', async () => {
    const res = await put('projects', { description: 'a'.repeat(1001) })
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'Description is too long: 1,000 characters at most.' })
    expect(updateEntity).not.toHaveBeenCalled()
  })

  it('refuses to empty a required field, and too many tags', async () => {
    expect((await put('experiences', { title: '' })).status).toBe(400)
    const tags = Array.from({ length: 31 }, (_, i) => `t${i}`)
    const res = await put('skills', { tags })
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'Tags has too many items: 30 at most.' })
  })

  it('answers 400 to an unknown kind, before looking anything up', async () => {
    const res = await put('hobbies', { title: 'x' })
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Invalid entity type' })
    expect(updateEntity).not.toHaveBeenCalled()
  })

  it('answers 404, not 403, for an entry that is not the user\'s: updateEntity is scoped by the user and finds nothing', async () => {
    updateEntity.mockResolvedValue(null)
    expect((await put('projects', { title: 'x' })).status).toBe(404)
    expect(updateEntity.mock.calls[0][0]).toBe('u1')
  })

  it('refuses a body a form could send (415) and a body that is too big (413)', async () => {
    expect((await put('projects', '{"title":"x"}', { 'content-type': 'text/plain' })).status).toBe(415)
    expect((await put('projects', { description: 'a'.repeat(200 * 1024) })).status).toBe(413)
    expect(updateEntity).not.toHaveBeenCalled()
  })
})

describe('GET and DELETE /api/entities/[type]/[id]', () => {
  it('reads and deletes with the user of the session, so another user\'s entry is a 404', async () => {
    getEntity.mockResolvedValue(null)
    expect((await GET(new Request('http://x'), ctx('projects'))).status).toBe(404)
    expect(getEntity).toHaveBeenCalledWith('u1', 'projects', 'proj-1')
    deleteEntity.mockResolvedValue(false)
    expect((await DELETE(new Request('http://x', { method: 'DELETE' }), ctx('projects'))).status).toBe(404)
    expect(deleteEntity).toHaveBeenCalledWith('u1', 'projects', 'proj-1')
  })

  it('answers 204 when it deleted, 400 for an unknown kind', async () => {
    expect((await DELETE(new Request('http://x', { method: 'DELETE' }), ctx('projects'))).status).toBe(204)
    expect((await GET(new Request('http://x'), ctx('hobbies'))).status).toBe(400)
  })
})
