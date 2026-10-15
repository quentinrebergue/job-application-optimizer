import { describe, it, expect } from 'vitest'
import { MAX_QUERY_LENGTH, jobsHref, matchesQuery, parseJobTab, parseQuery, parseStatusFilter } from './job-filter'

describe('parseStatusFilter', () => {
  it('keeps a known status', () => {
    expect(parseStatusFilter('applied')).toBe('applied')
  })

  it('falls back to all for anything else', () => {
    for (const value of [undefined, '', 'nope', ['applied']]) expect(parseStatusFilter(value)).toBe('all')
  })
})

describe('parseJobTab', () => {
  it('opens the offer unless the resume is asked for (cover letter not built yet)', () => {
    expect(parseJobTab('resume')).toBe('resume')
    for (const value of [undefined, 'offer', 'cover-letter', 'nope']) expect(parseJobTab(value)).toBe('offer')
  })
})

describe('parseQuery', () => {
  it('keeps a trimmed search, and nothing for anything else', () => {
    expect(parseQuery('  backend ')).toBe('backend')
    for (const value of [undefined, '', '   ', ['a', 'b']]) expect(parseQuery(value)).toBe('')
  })

  it('cuts a search that is too long', () => {
    expect(parseQuery('a'.repeat(MAX_QUERY_LENGTH + 50))).toHaveLength(MAX_QUERY_LENGTH)
  })
})

describe('matchesQuery', () => {
  const job = { title: 'Backend Engineer', company: 'Acme École' }

  it('finds every job for an empty search', () => {
    expect(matchesQuery(job, '')).toBe(true)
    expect(matchesQuery(job, '   ')).toBe(true)
  })

  it('looks in the title and the company, without case or accents', () => {
    expect(matchesQuery(job, 'backend')).toBe(true)
    expect(matchesQuery(job, 'ACME')).toBe(true)
    expect(matchesQuery(job, 'ecole')).toBe(true)
    expect(matchesQuery(job, 'engin')).toBe(true)
  })

  it('wants every word, in any order, across the title and the company', () => {
    expect(matchesQuery(job, 'acme backend')).toBe(true)
    expect(matchesQuery(job, 'backend frontend')).toBe(false)
    expect(matchesQuery(job, 'nothing')).toBe(false)
  })

  it('does not read the other fields of a job', () => {
    expect(matchesQuery({ ...job, description: 'remote', location: 'Lyon' } as typeof job, 'lyon')).toBe(false)
  })
})

describe('jobsHref', () => {
  it('writes only what differs from the default', () => {
    expect(jobsHref('all', '')).toBe('/jobs')
    expect(jobsHref('applied', '')).toBe('/jobs?status=applied')
    expect(jobsHref('all', ' acme ')).toBe('/jobs?q=acme')
    expect(jobsHref('offer', 'back end')).toBe('/jobs?status=offer&q=back+end')
  })
})
