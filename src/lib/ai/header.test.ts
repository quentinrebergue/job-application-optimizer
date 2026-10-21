import { describe, it, expect } from 'vitest'
import { LIMITS } from '@/config/limits'
import { checkProposal, headerForPrompt, newTerms } from './header'

describe('headerForPrompt', () => {
  it('takes the details of the person out of the title and the profile before the AI reads them', () => {
    const { title, profile } = headerForPrompt({
      title: 'Software Engineer',
      profile: 'I am Quentin Rebergue, reachable at quentin@example.com or +33 6 12 34 56 78, linkedin.com/in/qr. Backend developer.',
    }, 'Quentin Rebergue')
    // A title is not taken for a name: only the name of the profile is replaced.
    expect(title).toBe('Software Engineer')
    expect(profile).not.toContain('Quentin')
    expect(profile).toContain('[name]')
    for (const secret of ['quentin@example.com', '+33 6 12 34 56 78', 'linkedin.com/in/qr']) expect(profile).not.toContain(secret)
    expect(profile).toContain('[email]')
    expect(profile).toContain('Backend developer')
  })

  it('keeps an ordinary profile as it is, on one line for the title', () => {
    expect(headerForPrompt({ title: 'Platform\n Engineer', profile: 'Engineering student, 3 years of Go.' })).toEqual({
      title: 'Platform Engineer',
      profile: 'Engineering student, 3 years of Go.',
    })
  })
})

describe('newTerms', () => {
  const known = 'Backend developer. Go, Kubernetes, Terraform. Platform Engineer at Dust, Paris. 3 years.'

  it('lists the capitalised words and the numbers that the sources do not hold', () => {
    expect(newTerms('Looking for a role with Rust and Kubernetes, 5 years at Google.', known)).toEqual(['Rust', '5', 'Google'])
  })

  it('does not count a word that opens a sentence, a word of the sources in another case, or an accent', () => {
    expect(newTerms('Seeking a role. Platform engineer with GO and kubernetes.', known)).toEqual([])
    expect(newTerms('Développeur à Paris', 'Developpeur a paris')).toEqual([])
  })

  it('counts a number even at the start of a sentence, once, and stops at a few', () => {
    expect(newTerms('40% faster. 40% again', known)).toEqual(['40'])
    const many = Array.from({ length: 12 }, (_, i) => `Word${i}x`).join(' to ')
    expect(newTerms(`Hi ${many}`, '')).toHaveLength(8)
  })
})

describe('checkProposal', () => {
  const original = { title: 'Software Engineer', profile: 'Backend developer. Languages: Go and Python. Studies at EPITA.' }
  const known = 'Platform Engineer, Dust, Kubernetes'

  it('keeps a proposal that rewords what is tied to the offer', () => {
    const p = checkProposal({ title: 'Platform Engineer', profile: 'Platform developer. Languages: Go and Python. Studies at EPITA.' }, original, known)
    expect(p.title).toBe('Platform Engineer')
    expect(p.profile).toContain('Platform developer')
    expect(p.dropped).toEqual([])
    expect(p.profileNewTerms).toEqual([])
  })

  it('says nothing when the AI changes nothing or answers nothing', () => {
    expect(checkProposal({ title: ' Software  Engineer ', profile: original.profile }, original, known)).toMatchObject({ dropped: [], titleNewTerms: [] })
    const none = checkProposal({}, original, known)
    expect(none.title).toBeUndefined()
    expect(none.profile).toBeUndefined()
    expect(checkProposal({ title: 42, profile: null }, original, known).dropped).toEqual([])
  })

  it('refuses a text that holds a placeholder, an address, a link or a number that looks like a phone, and counts it', () => {
    const named = checkProposal({ title: '[name], Platform Engineer' }, original, known)
    expect(named.title).toBeUndefined()
    expect(named.dropped).toEqual(['title'])
    const mail = checkProposal({ profile: 'Backend developer. Write to me@example.com.' }, original, known)
    expect(mail.profile).toBeUndefined()
    expect(mail.dropped).toEqual(['profile'])
    expect(checkProposal({ profile: 'See linkedin.com/in/x.' }, original, known).dropped).toEqual(['profile'])
    expect(checkProposal({ profile: 'Call 06 12 34 56 78.' }, original, known).dropped).toEqual(['profile'])
  })

  it('refuses a text over the limit of its field', () => {
    expect(checkProposal({ title: 'x'.repeat(LIMITS.profile.resume_title + 1) }, original, known).dropped).toEqual(['title'])
    expect(checkProposal({ profile: 'y'.repeat(LIMITS.profile.profile_text + 1) }, original, known).dropped).toEqual(['profile'])
  })

  it('lists the new words of a proposal, to be checked by the user', () => {
    const p = checkProposal({ profile: 'Backend developer. Languages: Go and Python. Studies at Stanford, 8 years of Rust.' }, original, known)
    expect(p.profileNewTerms).toEqual(['Stanford', '8', 'Rust'])
    expect(p.dropped).toEqual([])
  })

  it('keeps the title on one line', () => {
    expect(checkProposal({ title: 'Platform\nEngineer' }, original, known).title).toBe('Platform Engineer')
  })
})
