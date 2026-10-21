import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { EntityMeta } from '@/types'

const askGateway = vi.fn()
vi.mock('./gateway', () => ({ askGateway: (...a: unknown[]) => askGateway(...a) }))

const { rankWithUsage } = await import('./index')

const exp = (id: string, title: string): EntityMeta => ({ id, type: 'experiences', title, company: 'Acme', period: '2022', description: 'Ran the platform.', tags: [] }) as EntityMeta
const library = { experiences: [exp('e1', 'Platform')], projects: [], skills: [] }

const header = {
  title: 'Software Engineer',
  profile: 'I am Ada Lovelace (ada@example.com, +33 6 12 34 56 78, linkedin.com/in/ada). Backend developer.',
  fullName: 'Ada Lovelace',
}

beforeEach(() => {
  askGateway.mockReset().mockResolvedValue({
    content: { levels: { E1: 3 }, best: {}, ats_tags: [], new_skill_tags: [], title: 'Platform Engineer', profile: 'Platform developer.' },
    usage: { prompt_tokens: 10, completion_tokens: 5 },
    model: 'm',
  })
})

describe('ranking with the header of the candidate (#294)', () => {
  it('never sends the name, the email, the phone or the links of the person', async () => {
    await rankWithUsage('u1', 'Platform Engineer', 'Dust', 'Kubernetes', library, {}, header)
    const request = JSON.stringify(askGateway.mock.calls[0][0])
    for (const secret of ['Ada', 'Lovelace', 'ada@example.com', '+33 6 12 34 56 78', 'linkedin.com/in/ada']) {
      expect(request, secret).not.toContain(secret)
    }
    expect(request).toContain('[name]')
    expect(request).toContain('Backend developer')
  })

  it('holds the answer to a title and a profile, and returns them checked', async () => {
    const { analysis } = await rankWithUsage('u1', 'Platform Engineer', 'Dust', 'Kubernetes', library, {}, header)
    expect(askGateway.mock.calls[0][0].schema.required).toEqual(expect.arrayContaining(['title', 'profile']))
    expect(analysis.recommended_title).toBe('Platform Engineer')
    expect(analysis.recommended_profile).toBe('Platform developer.')
  })

  it('refuses a proposal that brings back a detail of the person, and says so in the diagnostics', async () => {
    askGateway.mockResolvedValue({
      content: { levels: { E1: 3 }, best: {}, ats_tags: [], new_skill_tags: [], title: '[name], Platform Engineer', profile: 'Platform developer. ada@example.com' },
      usage: { prompt_tokens: 10, completion_tokens: 5 },
    })
    const { analysis, diagnostics } = await rankWithUsage('u1', 'Platform Engineer', 'Dust', 'Kubernetes', library, {}, header)
    expect(analysis.recommended_title).toBeUndefined()
    expect(analysis.recommended_profile).toBeUndefined()
    expect(diagnostics.droppedProposals).toEqual(['title', 'profile'])
  })

  it('asks nothing of the header when the candidate wrote none: the request is the one of before', async () => {
    await rankWithUsage('u1', 'Platform Engineer', 'Dust', 'Kubernetes', library, {}, { title: ' ', profile: '' })
    const call = askGateway.mock.calls[0][0]
    expect(call.prompt).not.toContain('CANDIDATE HEADER')
    expect(call.schema.required).not.toContain('title')
  })
})
