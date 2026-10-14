// The library entries against a real Postgres (#221): the merge of an update, the scope by user, the counts.
import { it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import type { Pool } from 'pg'
import { dbDescribe, getPool, makeUser, resetData } from '@/tests/db/helpers'
import { countEntities, createEntity, deleteEntity, getEntity, listEntities, updateEntity } from './entities'

let pool: Pool
let alice: string
let bob: string

dbDescribe('entities on Postgres', () => {
  beforeAll(async () => {
    pool = await getPool()
  })
  beforeEach(async () => {
    await resetData(pool)
    alice = await makeUser(pool)
    bob = await makeUser(pool)
  })
  afterAll(async () => {
    await pool.end()
  })

  const project = { title: 'Queue', tech: ['Go', 'Redis'], description: 'A task queue.', tags: ['Go', 'Redis'] }

  it('creates an entry with an id of its kind and gives back what was written', async () => {
    const created = await createEntity(alice, 'projects', project as never)
    expect(created.id).toMatch(/^proj-[0-9a-f]{8}$/)
    expect(created).toMatchObject({ type: 'projects', title: 'Queue', tech: ['Go', 'Redis'], tags: ['Go', 'Redis'], description: 'A task queue.' })
  })

  it('reads an entry saved without some fields as the forms save them: empty, never missing (an old import)', async () => {
    const insert = (id: string, type: string, data: object) =>
      pool.query("INSERT INTO entities (id, user_id, type, tags, latex_snippet, data) VALUES ($1, $2, $3, '{}', '', $4)", [id, alice, type, JSON.stringify(data)])
    await insert('expe-bare', 'experiences', { title: 'Stage', company: 'Acme' })
    await insert('proj-bare', 'projects', { title: 'A project' })
    await insert('educ-bare', 'education', { degree: 'Diploma', institution: 'EPITA' })
    expect(await getEntity(alice, 'experiences', 'expe-bare')).toMatchObject({ location: '', period: '', description: '' })
    expect(await getEntity(alice, 'projects', 'proj-bare')).toMatchObject({ tech: [], description: '' })
    expect((await listEntities(alice, 'education'))[0]).toMatchObject({ period: '' })
    // What is saved is not overwritten by the defaults.
    await insert('expe-full', 'experiences', { title: 'Job', company: 'Acme', period: '2020', description: 'Did things' })
    expect(await getEntity(alice, 'experiences', 'expe-full')).toMatchObject({ period: '2020', description: 'Did things' })
  })

  it('keeps the tags in their own column and the rest as one document, and rebuilds the same entry', async () => {
    const created = await createEntity(alice, 'projects', project as never)
    const { rows } = await pool.query('SELECT tags, data FROM entities WHERE id = $1', [created.id])
    expect(rows[0].tags).toEqual(['Go', 'Redis'])
    expect(rows[0].data).toEqual({ title: 'Queue', tech: ['Go', 'Redis'], description: 'A task queue.' })
    expect(await getEntity(alice, 'projects', created.id)).toEqual(created)
  })

  it('updates by merging: the fields that are not sent stay as they were', async () => {
    const created = await createEntity(alice, 'projects', project as never)
    const updated = await updateEntity(alice, 'projects', created.id, { description: 'A better queue.' } as never)
    expect(updated).toMatchObject({ title: 'Queue', tech: ['Go', 'Redis'], tags: ['Go', 'Redis'], description: 'A better queue.' })
  })

  it('replaces the tags when they are sent, and empties them with an empty list', async () => {
    const created = await createEntity(alice, 'projects', project as never)
    expect((await updateEntity(alice, 'projects', created.id, { tags: ['Rust'] } as never))?.tags).toEqual(['Rust'])
    expect((await updateEntity(alice, 'projects', created.id, { tags: [] } as never))?.tags).toEqual([])
  })

  it('does not let the id or the kind be changed by an update', async () => {
    const created = await createEntity(alice, 'projects', project as never)
    const updated = await updateEntity(alice, 'projects', created.id, { id: 'proj-evil', type: 'skills', title: 'New' } as never)
    expect(updated).toMatchObject({ id: created.id, type: 'projects', title: 'New' })
  })

  it('does not touch an entry of another user: an update finds nothing and changes nothing', async () => {
    const created = await createEntity(alice, 'projects', project as never)
    expect(await updateEntity(bob, 'projects', created.id, { title: 'Hijacked' } as never)).toBeNull()
    expect(await getEntity(alice, 'projects', created.id)).toMatchObject({ title: 'Queue' })
  })

  it('does not find an entry through the wrong kind', async () => {
    const created = await createEntity(alice, 'projects', project as never)
    expect(await getEntity(alice, 'experiences', created.id)).toBeNull()
    expect(await updateEntity(alice, 'experiences', created.id, { title: 'x' } as never)).toBeNull()
  })

  it('lists only the entries of the user and of the kind, in order of id', async () => {
    const a1 = await createEntity(alice, 'projects', { ...project, title: 'A1' } as never)
    const a2 = await createEntity(alice, 'projects', { ...project, title: 'A2' } as never)
    await createEntity(alice, 'experiences', { title: 'Job', company: 'Acme', period: '2022', description: '', tags: [] } as never)
    await createEntity(bob, 'projects', { ...project, title: 'Bob' } as never)
    const listed = await listEntities(alice, 'projects')
    expect(listed.map((e) => e.id)).toEqual([a1.id, a2.id].sort())
    expect(listed.every((e) => e.type === 'projects')).toBe(true)
  })

  it('counts per user and per kind, which the cap on entries relies on', async () => {
    for (let i = 0; i < 3; i++) await createEntity(alice, 'projects', project as never)
    await createEntity(alice, 'experiences', { title: 'Job', company: 'Acme', period: '2022', description: '', tags: [] } as never)
    await createEntity(bob, 'projects', project as never)
    expect(await countEntities(alice, 'projects')).toBe(3)
    expect(await countEntities(alice, 'experiences')).toBe(1)
    expect(await countEntities(alice, 'skills')).toBe(0)
    expect(await countEntities(bob, 'projects')).toBe(1)
  })

  it('deletes only the entry of its owner', async () => {
    const created = await createEntity(alice, 'projects', project as never)
    expect(await deleteEntity(bob, 'projects', created.id)).toBe(false)
    expect(await getEntity(alice, 'projects', created.id)).not.toBeNull()
    expect(await deleteEntity(alice, 'projects', created.id)).toBe(true)
    expect(await getEntity(alice, 'projects', created.id)).toBeNull()
  })

  it('goes away with its user (an account that is deleted takes its entries)', async () => {
    await createEntity(alice, 'projects', project as never)
    await pool.query('DELETE FROM users WHERE id = $1', [alice])
    expect(await countEntities(alice, 'projects')).toBe(0)
  })
})
