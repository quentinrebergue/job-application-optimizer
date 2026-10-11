import { describe, it, expect } from 'vitest'
import type { EntityMeta } from '@/types'
import { LIMITS, MAX_ENTRIES } from '@/config/limits'
import { checkPromptSize } from './prompt-size'
import { buildRankingPrompt } from './ranking-prompt'

const exp = (n: number, description = 'd'): EntityMeta => ({ id: `exp-${n}`, type: 'experiences', title: `Experience ${n}`, company: 'Acme', period: '2022', description, tags: [] }) as EntityMeta
const proj = (n: number, description = 'd'): EntityMeta => ({ id: `proj-${n}`, type: 'projects', title: `Project ${n}`, tech: ['C', 'Go'], description, tags: [] }) as EntityMeta
const skill = (n: number, tags: string[]): EntityMeta => ({ id: `skil-${n}`, type: 'skills', name: `Skill ${n}`, category: 'x', level: 'advanced', tags }) as EntityMeta

const small = { experiences: [exp(1)], projects: [proj(1)], skills: [] }

describe('checkPromptSize', () => {
  it('lets a normal prompt through', () => {
    const result = checkPromptSize('Dev', 'Acme', 'Build things', small)
    expect(result.ok).toBe(true)
    expect(result.chars).toBeGreaterThan(1500)
  })

  it('refuses a prompt over the limit, with the sizes and what takes the room', () => {
    const result = checkPromptSize('Dev', 'Acme', 'Build things', small, 1000)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.max).toBe(1000)
    expect(result.message).toMatch(/too long for the AI to read in one go \(\d[\d,]* of 1,000 characters: the library takes \d+, the offer \d+\)/)
    expect(result.message).toContain('Remove the entries you do not need')
    expect(result.message).toContain('Experience 1')
    expect(result.message).toContain(', then try again.')
  })

  it('names the three longest entries, longest first', () => {
    const library = {
      experiences: [exp(1, 'a'.repeat(100)), exp(2, 'a'.repeat(500))],
      projects: [proj(1, 'a'.repeat(300)), proj(2, 'a'.repeat(200))],
      skills: [],
    }
    const result = checkPromptSize('Dev', 'Acme', 'o', library, 1000)
    if (result.ok) throw new Error('expected a refusal')
    const named = result.message.match(/longest: (.*), then/)![1]
    expect(named.split('), ').map((s) => s.split(' (')[0])).toEqual(['Experience 2', 'Project 1', 'Project 2'])
  })

  it('asks to shorten the offer when the offer is what takes the room', () => {
    const result = checkPromptSize('Dev', 'Acme', 'x'.repeat(5000), small, 3000)
    if (result.ok) throw new Error('expected a refusal')
    expect(result.message).toContain('Shorten the offer, then try again.')
    expect(result.message).not.toContain('longest')
  })

  it('counts characters, as the gateway does, not bytes', () => {
    const accents = checkPromptSize('Dev', 'Acme', 'é'.repeat(100), small, 1_000_000)
    const ascii = checkPromptSize('Dev', 'Acme', 'e'.repeat(100), small, 1_000_000)
    expect(accents.chars).toBe(ascii.chars)
  })

  it('takes its limit from the environment by default (AI_MAX_PROMPT_CHARS, 60,000)', () => {
    const result = checkPromptSize('Dev', 'Acme', 'x'.repeat(61_000), small)
    expect(result.ok).toBe(false)
    expect(checkPromptSize('Dev', 'Acme', 'x'.repeat(15_000), small).ok).toBe(true)
  })
})

describe('a full library fits (#185)', () => {
  // Every kind at its cap, every description at its limit, 20 tags per skill as a heavy user writes
  // them, and an offer at its limit. Nothing is cut: this is what the caps and the limits are for.
  const heavy = {
    experiences: Array.from({ length: MAX_ENTRIES.experiences }, (_, i) => exp(i, 'a'.repeat(LIMITS.experiences.description))),
    projects: Array.from({ length: MAX_ENTRIES.projects }, (_, i) => proj(i, 'a'.repeat(LIMITS.projects.description))),
    skills: Array.from({ length: MAX_ENTRIES.skills }, (_, i) => skill(i, Array.from({ length: 20 }, (_, t) => `Technology${t}`))),
  }

  it('is under the prompt limit with an offer at its limit, and leaves room', () => {
    const result = checkPromptSize('Dev', 'Acme', 'a'.repeat(LIMITS.job.description), heavy)
    expect(result.ok, result.ok ? '' : result.message).toBe(true)
    // About 47,800 today. Written as a bound so that raising a cap or a limit shows its cost here.
    expect(result.chars).toBeLessThan(55_000)
  })

  it('sends the whole description of every entry', () => {
    const { prompt } = buildRankingPrompt('Dev', 'Acme', 'o', heavy)
    expect(prompt).toContain('a'.repeat(LIMITS.projects.description))
    expect(prompt).not.toContain('…')
  })
})
