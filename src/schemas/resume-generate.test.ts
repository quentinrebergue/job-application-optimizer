import { describe, it, expect } from 'vitest'
import { GenerateResumeSchema } from './resume-generate'

describe('GenerateResumeSchema', () => {
  it('accepts a job id alone, or a list of entity ids alone', () => {
    expect(GenerateResumeSchema.safeParse({ jobId: 'job-1' }).success).toBe(true)
    expect(GenerateResumeSchema.safeParse({ entityIds: ['a', 'b'] }).success).toBe(true)
  })

  it('rejects a request with neither', () => {
    const result = GenerateResumeSchema.safeParse({ template: 'classic' })
    expect(result.success).toBe(false)
  })

  it('accepts a template id and string or number options', () => {
    const result = GenerateResumeSchema.safeParse({
      jobId: 'job-1',
      template: 'compact',
      options: { fontSize: 10, datePlacement: 'inline' },
    })
    expect(result.success).toBe(true)
  })

  it('rejects a template id that could escape a directory or is not lowercase', () => {
    for (const template of ['../etc', 'Classic', '', 'a/b']) {
      expect(GenerateResumeSchema.safeParse({ jobId: 'job-1', template }).success, template).toBe(false)
    }
  })

  it('rejects non-scalar options and oversized lists', () => {
    expect(GenerateResumeSchema.safeParse({ jobId: 'j', options: { a: { nested: true } } }).success).toBe(false)
    expect(GenerateResumeSchema.safeParse({ entityIds: Array(501).fill('x') }).success).toBe(false)
  })
})
