import { describe, it, expect, vi, beforeEach } from 'vitest'

const query = vi.fn()
vi.mock('@/lib/db', () => ({ pool: { query: (...args: unknown[]) => query(...args) } }))

const { createJob } = await import('./jobs')

const ROW = {
  id: 'job-1', user_id: 'u1', company: 'Acme', title: 'Engineer', description: 'Build', location: null, url: null,
  status: 'saved', tags: [], ats_tags: [], ai_analysis: null, date_added: new Date('2026-10-03T00:00:00Z'),
  resume_config: null,
}

beforeEach(() => {
  query.mockReset().mockResolvedValue({ rows: [ROW] })
})

describe('createJob', () => {
  it('writes empty tag lists when the form sends none (the columns are NOT NULL, #97)', async () => {
    await createJob('u1', { company: 'Acme', title: 'Engineer', description: 'Build', status: 'saved' } as never)
    const params = query.mock.calls[0][1] as unknown[]
    expect(params[8]).toEqual([]) // tags
    expect(params[9]).toEqual([]) // ats_tags
  })

  it('keeps the tags it is given', async () => {
    await createJob('u1', { company: 'Acme', title: 'Engineer', description: 'Build', status: 'saved', tags: ['go'] } as never)
    expect((query.mock.calls[0][1] as unknown[])[8]).toEqual(['go'])
  })
})

describe('updateJob', () => {
  it('stores NULL and an empty ats_tags when the ranking is cleared (#167)', async () => {
    const { updateJob } = await import('./jobs')
    query.mockReset()
      .mockResolvedValueOnce({ rows: [{ ...ROW, ats_tags: ['go'], ai_analysis: { job_id: 'job-1' } }] })
      .mockResolvedValueOnce({ rows: [ROW] })
    await updateJob('u1', 'job-1', { ai_analysis: undefined, ats_tags: [] })
    const params = query.mock.calls[1][1] as unknown[]
    expect(params[9]).toEqual([]) // ats_tags
    expect(params[10]).toBeNull() // ai_analysis
  })
})
