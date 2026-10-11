// The jobs against a real Postgres (#221): the columns that cannot be NULL, the merge of an update, the scope
// by user, the counts and the resume of a job.
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import type { Pool } from 'pg'
import { dbDescribe, getPool, makeUser, resetData } from '@/tests/db/helpers'
import { countJobs, createJob, deleteJob, getJob, getResumeConfig, listJobs, saveResumeConfig, updateJob } from './jobs'

let pool: Pool
let alice: string
let bob: string

const offer = { title: 'Engineer', company: 'Acme', description: 'Build things', status: 'saved' } as const

dbDescribe('jobs on Postgres', () => {
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

  it('creates a job from the form without tags: the NOT NULL columns get empty lists, not NULL (#97)', async () => {
    const job = await createJob(alice, { ...offer } as never)
    expect(job).toMatchObject({ title: 'Engineer', company: 'Acme', status: 'saved', tags: [] })
    const { rows } = await pool.query('SELECT tags, ats_tags, location, url FROM jobs WHERE id = $1', [job.id])
    expect(rows[0]).toEqual({ tags: [], ats_tags: [], location: null, url: null })
  })

  it('gives back a job with a date of creation as text, and an id of its own', async () => {
    const job = await createJob(alice, { ...offer, location: 'Paris', url: 'https://x.test/job' } as never)
    expect(job.id).toMatch(/^job-[0-9a-f]{8}$/)
    expect(job.date_added).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(job).toMatchObject({ location: 'Paris', url: 'https://x.test/job' })
  })

  it('updates by merging: one field at a time, as the autosave sends it', async () => {
    const job = await createJob(alice, { ...offer, location: 'Paris' } as never)
    const updated = await updateJob(alice, job.id, { status: 'applied' })
    expect(updated).toMatchObject({ status: 'applied', title: 'Engineer', location: 'Paris', description: 'Build things' })
  })

  it('lets a field be emptied: the location back to nothing', async () => {
    const job = await createJob(alice, { ...offer, location: 'Paris' } as never)
    const updated = await updateJob(alice, job.id, { location: '' })
    expect(updated?.location).toBe('')
  })

  it('clears the ranking: no analysis (NULL in the column) and no ATS tags (#167)', async () => {
    const job = await createJob(alice, { ...offer } as never)
    await updateJob(alice, job.id, { ats_tags: ['go'], ai_analysis: { job_id: job.id, summary: 'ok' } as never })
    expect((await getJob(alice, job.id))?.ai_analysis).toEqual({ job_id: job.id, summary: 'ok' })
    await updateJob(alice, job.id, { ai_analysis: undefined, ats_tags: [] })
    const { rows } = await pool.query('SELECT ai_analysis, ats_tags FROM jobs WHERE id = $1', [job.id])
    expect(rows[0]).toEqual({ ai_analysis: null, ats_tags: [] })
  })

  it('does not touch a job of another user', async () => {
    const job = await createJob(alice, { ...offer } as never)
    expect(await updateJob(bob, job.id, { title: 'Hijacked' })).toBeNull()
    expect(await getJob(bob, job.id)).toBeNull()
    expect(await deleteJob(bob, job.id)).toBe(false)
    expect((await getJob(alice, job.id))?.title).toBe('Engineer')
  })

  it('lists only the jobs of the user, the newest first', async () => {
    const first = await createJob(alice, { ...offer, title: 'First' } as never)
    await pool.query("UPDATE jobs SET date_added = now() - interval '1 day' WHERE id = $1", [first.id])
    const second = await createJob(alice, { ...offer, title: 'Second' } as never)
    await createJob(bob, { ...offer, title: 'Bob' } as never)
    expect((await listJobs(alice)).map((j) => j.id)).toEqual([second.id, first.id])
  })

  it('counts the jobs of the user, which the cap on jobs relies on', async () => {
    for (let i = 0; i < 3; i++) await createJob(alice, { ...offer } as never)
    await createJob(bob, { ...offer } as never)
    expect(await countJobs(alice)).toBe(3)
    expect(await countJobs(bob)).toBe(1)
    expect(await countJobs(await makeUser(pool))).toBe(0)
  })

  describe('the resume of a job', () => {
    it('is empty until it is saved', async () => {
      const job = await createJob(alice, { ...offer } as never)
      expect(await getResumeConfig(alice, job.id)).toEqual({ selected_entity_ids: [], ai_rankings: [], profile_text: '' })
    })

    it('is saved as one document and read back', async () => {
      const job = await createJob(alice, { ...offer } as never)
      const config = { selected_entity_ids: ['exp-1', 'proj-2'], ai_rankings: [], profile_text: 'Hello', resume_title: 'Engineer' }
      await saveResumeConfig(alice, job.id, config as never)
      expect(await getResumeConfig(alice, job.id)).toEqual(config)
    })

    it('belongs to the user: another user neither reads it nor overwrites it', async () => {
      const job = await createJob(alice, { ...offer } as never)
      const config = { selected_entity_ids: ['exp-1'], ai_rankings: [], profile_text: 'Mine' }
      await saveResumeConfig(alice, job.id, config as never)
      expect(await getResumeConfig(bob, job.id)).toEqual({ selected_entity_ids: [], ai_rankings: [], profile_text: '' })
      await saveResumeConfig(bob, job.id, { selected_entity_ids: [], ai_rankings: [], profile_text: 'Hijacked' } as never)
      expect(await getResumeConfig(alice, job.id)).toEqual(config)
    })
  })

  it('goes away with its user', async () => {
    await createJob(alice, { ...offer } as never)
    await pool.query('DELETE FROM users WHERE id = $1', [alice])
    expect(await countJobs(alice)).toBe(0)
  })
})
