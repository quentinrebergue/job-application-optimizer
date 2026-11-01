import { describe, it, expect } from 'vitest'
import { LIMITS } from '@/config/limits'
import { EntityCreateSchema, EntityUpdateSchemas, JobCreateSchema, JobUpdateSchema, ResumeConfigInputSchema } from './inputs'

const job = { title: 'Dev', company: 'Acme', description: 'Build things', status: 'saved' }
const tooLong = (n: number) => 'a'.repeat(n + 1)

describe('JobCreateSchema', () => {
  it('accepts a job with the limits to the character', () => {
    const parsed = JobCreateSchema.safeParse({
      ...job,
      title: 'a'.repeat(LIMITS.job.title),
      company: 'a'.repeat(LIMITS.job.company),
      location: 'a'.repeat(LIMITS.job.location),
      url: 'a'.repeat(LIMITS.job.url),
      description: 'a'.repeat(LIMITS.job.description),
    })
    expect(parsed.success).toBe(true)
  })

  it.each([
    ['title', LIMITS.job.title],
    ['company', LIMITS.job.company],
    ['location', LIMITS.job.location],
    ['url', LIMITS.job.url],
    ['description', LIMITS.job.description],
  ])('refuses a %s one character over its limit', (field, max) => {
    expect(JobCreateSchema.safeParse({ ...job, [field]: tooLong(max) }).success).toBe(false)
  })

  it('needs a title, a company, a text and a status', () => {
    for (const field of ['title', 'company', 'description', 'status']) {
      expect(JobCreateSchema.safeParse({ ...job, [field]: undefined }).success).toBe(false)
    }
    expect(JobCreateSchema.safeParse({ ...job, description: '   ' }).success).toBe(false)
  })

  it('drops what a client must not set', () => {
    const parsed = JobCreateSchema.parse({ ...job, id: 'x', user_id: 'y', ai_analysis: { a: 1 }, ats_tags: ['z'] })
    expect(parsed).not.toHaveProperty('id')
    expect(parsed).not.toHaveProperty('user_id')
    expect(parsed).not.toHaveProperty('ai_analysis')
    expect(parsed).not.toHaveProperty('ats_tags')
  })
})

describe('JobUpdateSchema', () => {
  it('takes one field and leaves the others out, not reset', () => {
    expect(JobUpdateSchema.parse({ status: 'applied' })).toEqual({ status: 'applied' })
  })

  it('lets the description or the location be emptied, not the title', () => {
    expect(JobUpdateSchema.safeParse({ description: '', location: '', url: '' }).success).toBe(true)
    expect(JobUpdateSchema.safeParse({ title: '' }).success).toBe(false)
  })

  it('refuses a field over its limit', () => {
    expect(JobUpdateSchema.safeParse({ description: tooLong(LIMITS.job.description) }).success).toBe(false)
  })
})

describe('the link of a project (#322)', () => {
  const create = (url: unknown) => EntityCreateSchema.safeParse({ type: 'projects', title: 'T', url })

  it('is saved as a complete web address, and may be left empty', () => {
    expect(create('github.com/you/project')).toMatchObject({ success: true, data: { url: 'https://github.com/you/project' } })
    expect(create('')).toMatchObject({ success: true, data: { url: '' } })
    expect(EntityCreateSchema.safeParse({ type: 'projects', title: 'T' })).toMatchObject({ success: true })
  })

  it('refuses what is not a web address, and an address that is too long', () => {
    for (const bad of ['javascript:alert(1)', 'ftp://example.com/x', 'a b.com', 'localhost']) expect(create(bad).success, bad).toBe(false)
    expect(create(`https://example.com/${'a'.repeat(LIMITS.projects.url)}`).success).toBe(false)
  })

  it('is checked on an update too, and only when it is sent', () => {
    expect(EntityUpdateSchemas.projects.safeParse({ title: 'New' }).success).toBe(true)
    expect(EntityUpdateSchemas.projects.safeParse({ url: 'javascript:alert(1)' }).success).toBe(false)
    expect(EntityUpdateSchemas.projects.safeParse({ url: 'you.dev/demo' })).toMatchObject({ success: true, data: { url: 'https://you.dev/demo' } })
  })
})

describe('EntityCreateSchema', () => {
  it('accepts each kind with its required fields', () => {
    expect(EntityCreateSchema.safeParse({ type: 'experiences', title: 'T', company: 'C' }).success).toBe(true)
    expect(EntityCreateSchema.safeParse({ type: 'projects', title: 'T' }).success).toBe(true)
    expect(EntityCreateSchema.safeParse({ type: 'skills', name: 'N', category: 'C' }).success).toBe(true)
    expect(EntityCreateSchema.safeParse({ type: 'education', degree: 'D', institution: 'I' }).success).toBe(true)
  })

  it('refuses an unknown kind and a missing required field', () => {
    expect(EntityCreateSchema.safeParse({ type: 'hobbies', title: 'T' }).success).toBe(false)
    expect(EntityCreateSchema.safeParse({ type: 'experiences', title: 'T' }).success).toBe(false)
  })

  it('refuses a description over its limit', () => {
    const body = { type: 'projects', title: 'T', description: tooLong(LIMITS.projects.description) }
    expect(EntityCreateSchema.safeParse(body).success).toBe(false)
    expect(EntityCreateSchema.safeParse({ ...body, description: 'a'.repeat(LIMITS.projects.description) }).success).toBe(true)
  })

  it('limits the number of tags and the size of each', () => {
    const base = { type: 'skills', name: 'N', category: 'C' }
    const many = Array.from({ length: LIMITS.tagsPerEntry + 1 }, (_, i) => `t${i}`)
    expect(EntityCreateSchema.safeParse({ ...base, tags: many }).success).toBe(false)
    expect(EntityCreateSchema.safeParse({ ...base, tags: many.slice(1) }).success).toBe(true)
    expect(EntityCreateSchema.safeParse({ ...base, tags: [tooLong(LIMITS.tag)] }).success).toBe(false)
  })

  it('does not let a client choose the id or write unknown keys', () => {
    const parsed = EntityCreateSchema.parse({ type: 'projects', title: 'T', id: 'proj-1', secret: 'x' })
    expect(parsed).not.toHaveProperty('id')
    expect(parsed).not.toHaveProperty('secret')
  })
})

describe('EntityUpdateSchemas', () => {
  it('takes one field, as the autosave sends it', () => {
    expect(EntityUpdateSchemas.projects.parse({ description: 'new' })).toEqual({ description: 'new' })
  })

  it('does not write a default over what is saved', () => {
    expect(EntityUpdateSchemas.skills.parse({ tags: ['C'] })).toEqual({ tags: ['C'] })
  })

  it('still refuses to empty a required field or to go over a limit', () => {
    expect(EntityUpdateSchemas.experiences.safeParse({ title: '' }).success).toBe(false)
    expect(EntityUpdateSchemas.experiences.safeParse({ description: tooLong(LIMITS.experiences.description) }).success).toBe(false)
  })
})

describe('ResumeConfigInputSchema', () => {
  const config = { selected_entity_ids: ['exp-1'], ai_rankings: [], profile_text: 'Hello' }

  it('accepts a normal resume', () => {
    expect(ResumeConfigInputSchema.safeParse(config).success).toBe(true)
  })

  it('keeps an old AI score outside 0 to 1 instead of failing the whole save', () => {
    expect(ResumeConfigInputSchema.safeParse({ ...config, ai_rankings: [{ entity_id: 'exp-1', score: 7 }] }).success).toBe(true)
  })

  it('refuses texts and lists over their limits', () => {
    expect(ResumeConfigInputSchema.safeParse({ ...config, profile_text: tooLong(LIMITS.profile.profile_text) }).success).toBe(false)
    expect(ResumeConfigInputSchema.safeParse({ ...config, resume_title: tooLong(LIMITS.profile.resume_title) }).success).toBe(false)
    expect(ResumeConfigInputSchema.safeParse({ ...config, entity_description_overrides: { 'exp-1': tooLong(LIMITS.resume.entityDescription) } }).success).toBe(false)
    expect(ResumeConfigInputSchema.safeParse({ ...config, selected_entity_ids: Array(LIMITS.resume.items + 1).fill('x') }).success).toBe(false)
  })
})
