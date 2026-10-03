import { describe, it, expect } from 'vitest'
import { loginUrlFor, returnToFrom, safePath } from './return-to'

describe('safePath', () => {
  it('keeps same-site paths', () => {
    expect(safePath('/jobs/new?title=x')).toBe('/jobs/new?title=x')
  })

  it('rejects anything that could leave the site', () => {
    for (const value of ['https://evil.test', '//evil.test', '/\\evil.test', 'jobs', '', null, undefined, 42]) {
      expect(safePath(value)).toBe('/')
    }
  })
})

describe('login round trip', () => {
  it('keeps the path and the original query, without encoding the query twice', () => {
    const original = new URLSearchParams({ title: 'Engineer', description: 'Build things & ship' })
    const login = loginUrlFor('/jobs/new', original)

    expect(login).toBe(`/login?${original.toString()}&next=%2Fjobs%2Fnew`)
    expect(login.length).toBeLessThan(`/login?next=${encodeURIComponent('/jobs/new?' + original)}`.length)

    const back = returnToFrom(new URL(login, 'http://localhost').searchParams)
    expect(back).toBe(`/jobs/new?${original.toString()}`)
  })

  it('goes to /login plainly for the home page', () => {
    expect(loginUrlFor('/', new URLSearchParams())).toBe('/login')
    expect(returnToFrom(new URLSearchParams())).toBe('/')
  })

  it('ignores an unsafe next and its query', () => {
    expect(returnToFrom(new URLSearchParams({ next: '//evil.test', title: 'x' }))).toBe('/')
  })
})
