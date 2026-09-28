import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import { createJob, listJobs, readJob, updateJobStatus } from './jobs.js'

let tmpDir: string

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mcp-test-'))
})

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true })
})

describe('createJob', () => {
  it('writes offer.json and returns the job', async () => {
    const job = await createJob(tmpDir, { title: 'SWE', company: 'Acme' })

    expect(job.id).toMatch(/^job-[0-9a-f]{8}$/)
    expect(job.title).toBe('SWE')
    expect(job.company).toBe('Acme')
    expect(job.status).toBe('saved')
    expect(job.description).toBe('')
    expect(job.date_added).toBeTruthy()

    const raw = await fs.readFile(path.join(tmpDir, job.id, 'offer.json'), 'utf-8')
    expect(JSON.parse(raw)).toMatchObject({ id: job.id, title: 'SWE', company: 'Acme' })

    // app also needs these to render the job detail page
    const config = await fs.readFile(path.join(tmpDir, job.id, 'resume-config.json'), 'utf-8')
    expect(JSON.parse(config)).toEqual({ selected_entity_ids: [], ai_rankings: [] })
    const generated = await fs.stat(path.join(tmpDir, job.id, 'generated'))
    expect(generated.isDirectory()).toBe(true)
  })

  it('trims whitespace from title and company', async () => {
    const job = await createJob(tmpDir, { title: '  Engineer  ', company: '  Corp  ' })
    expect(job.title).toBe('Engineer')
    expect(job.company).toBe('Corp')
  })

  it('stores description and url when provided', async () => {
    const job = await createJob(tmpDir, {
      title: 'Dev',
      company: 'CERN',
      description: 'Build accelerators',
      url: 'https://cern.ch/jobs/1',
      status: 'applied',
    })
    expect(job.description).toBe('Build accelerators')
    expect(job.url).toBe('https://cern.ch/jobs/1')
    expect(job.status).toBe('applied')
  })

  it('generates unique IDs for each job', async () => {
    const a = await createJob(tmpDir, { title: 'A', company: 'X' })
    const b = await createJob(tmpDir, { title: 'B', company: 'X' })
    expect(a.id).not.toBe(b.id)
  })
})

describe('readJob', () => {
  it('returns null for a non-existent job', async () => {
    const result = await readJob(tmpDir, 'job-notexist')
    expect(result).toBeNull()
  })

  it('returns the job after createJob', async () => {
    const created = await createJob(tmpDir, { title: 'QA', company: 'TestCo' })
    const read = await readJob(tmpDir, created.id)
    expect(read).toMatchObject({ id: created.id, title: 'QA' })
  })
})

describe('listJobs', () => {
  it('returns empty array when no jobs exist', async () => {
    expect(await listJobs(tmpDir)).toEqual([])
  })

  it('returns all created jobs', async () => {
    await createJob(tmpDir, { title: 'Job A', company: 'Alpha' })
    await createJob(tmpDir, { title: 'Job B', company: 'Beta' })
    const jobs = await listJobs(tmpDir)
    expect(jobs).toHaveLength(2)
    expect(jobs.map((j) => j.title)).toEqual(expect.arrayContaining(['Job A', 'Job B']))
  })

  it('ignores non-job-prefixed directories', async () => {
    await fs.mkdir(path.join(tmpDir, 'README.md'))
    await fs.mkdir(path.join(tmpDir, '.hidden'))
    await createJob(tmpDir, { title: 'Real Job', company: 'Co' })
    const jobs = await listJobs(tmpDir)
    expect(jobs).toHaveLength(1)
  })
})

describe('updateJobStatus', () => {
  it('returns null for a non-existent job', async () => {
    const result = await updateJobStatus(tmpDir, 'job-missing', 'applied')
    expect(result).toBeNull()
  })

  it('updates the status and returns prev + updated job', async () => {
    const created = await createJob(tmpDir, { title: 'Dev', company: 'Corp' })
    const result = await updateJobStatus(tmpDir, created.id, 'applied')

    expect(result).not.toBeNull()
    expect(result!.prev).toBe('saved')
    expect(result!.job.status).toBe('applied')
  })

  it('persists the updated status to disk', async () => {
    const created = await createJob(tmpDir, { title: 'Dev', company: 'Corp' })
    await updateJobStatus(tmpDir, created.id, 'interview')
    const reread = await readJob(tmpDir, created.id)
    expect(reread!.status).toBe('interview')
  })
})
