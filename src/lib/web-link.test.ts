import { describe, it, expect } from 'vitest'
import { linkTarget, normalizeGithub, normalizeWebLink } from './web-link'

describe('normalizeWebLink', () => {
  it('reads nothing as nothing, and completes an address typed without its scheme', () => {
    expect(normalizeWebLink('')).toBe('')
    expect(normalizeWebLink('   ')).toBe('')
    expect(normalizeWebLink('github.com/you/project')).toBe('https://github.com/you/project')
    expect(normalizeWebLink(' https://you.dev/demo?x=1 ')).toBe('https://you.dev/demo?x=1')
    expect(normalizeWebLink('http://example.com')).toBe('http://example.com/')
  })

  it('refuses what is not a web address: another scheme, a script, spaces, a host with no dot', () => {
    for (const bad of ['javascript:alert(1)', 'JavaScript://x.com/%0aalert(1)', 'ftp://example.com/file', 'mailto:me@example.com', 'data:text/html,hi', 'localhost', 'https://localhost:3000', 'two words.com', 'https://', 'https://exa mple.com', 'not a link']) {
      expect(normalizeWebLink(bad), bad).toBeNull()
    }
  })

  it('refuses a password in the address, and a host that ends with a dot', () => {
    expect(normalizeWebLink('https://user:pass@example.com')).toBeNull()
    expect(normalizeWebLink('https://user@example.com')).toBeNull()
    expect(normalizeWebLink('https://example.com./x')).toBeNull()
  })
})

describe('normalizeGithub', () => {
  it('completes a bare user name and keeps an address as github.com/name', () => {
    expect(normalizeGithub('quentinrebergue')).toBe('github.com/quentinrebergue')
    expect(normalizeGithub('github.com/quentinrebergue')).toBe('github.com/quentinrebergue')
    expect(normalizeGithub('https://github.com/quentinrebergue/')).toBe('github.com/quentinrebergue')
    expect(normalizeGithub('https://www.github.com/ada-l/project')).toBe('github.com/ada-l/project')
    expect(normalizeGithub('')).toBe('')
  })

  it('refuses an address that is not on GitHub, and a name GitHub could not have', () => {
    for (const bad of ['gitlab.com/you', 'https://example.com/github.com', 'github.com.evil.io/you', 'javascript:alert(1)', '-name', 'a'.repeat(40), 'two words']) {
      expect(normalizeGithub(bad), bad).toBeNull()
    }
  })
})

describe('linkTarget', () => {
  it('adds https when the scheme is missing, and leaves a complete address alone', () => {
    expect(linkTarget('github.com/you')).toBe('https://github.com/you')
    expect(linkTarget('http://example.com/a')).toBe('http://example.com/a')
  })
})
