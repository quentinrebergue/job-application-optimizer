import { describe, it, expect } from 'vitest'
import { cleanOffer } from './offer'

describe('cleanOffer', () => {
  it('drops the sections about the employer and keeps the ones about the job', () => {
    const text = cleanOffer(`WHAT YOU'LL DO:
Write C++ firmware.

REQUIRED SKILLS:
- C and C++
- RTOS

PAY AND BENEFITS:
- Stock options
- 25 days PTO`)
    expect(text).toContain('Write C++ firmware.')
    expect(text).toContain('- RTOS')
    expect(text).not.toMatch(/Stock options|PTO|PAY AND BENEFITS/)
  })

  it('resumes at the next heading about the job', () => {
    const text = cleanOffer('Benefits:\n- Free lunch\n\nResponsibilities:\n- Review code')
    expect(text).toBe('Responsibilities:\n- Review code')
  })

  it('drops a line that starts with an employer label, and its paragraph only', () => {
    const text = cleanOffer('You will build backends in Rust.\n\nOffer: relocation support; VSOP options.\nCompetitive compensation.\n\nWe use Python too.')
    expect(text).toContain('You will build backends in Rust.')
    expect(text).toContain('We use Python too.')
    expect(text).not.toMatch(/relocation|Competitive/)
  })

  it('drops a markdown "About the company" section but keeps "About the role"', () => {
    const text = cleanOffer('**About Mistral AI:**\nThey build models.\n\n**About the role:**\nBackend work.\n\n**Next Steps:** Talk to HR.')
    expect(text).toBe('**About the role:**\nBackend work.')
  })

  it('drops equal-opportunity sentences and links, inside a paragraph', () => {
    const text = cleanOffer('Build tools in Python. Acme is an equal opportunity employer and values diversity. Apply at https://acme.example/jobs now.')
    expect(text).toBe('Build tools in Python. Apply at now.')
  })

  it('leaves an offer with no heading about the employer as it is', () => {
    const offer = 'Helsing builds defence AI.\n\nDay-to-day: review code, build features.\n\nYou should know Rust.'
    expect(cleanOffer(offer)).toBe(offer)
  })

  it('does nothing twice', () => {
    const once = cleanOffer('Skills:\n- C\n\nBenefits:\n- Food\n\nEqual opportunity statement.')
    expect(cleanOffer(once)).toBe(once)
  })
})
