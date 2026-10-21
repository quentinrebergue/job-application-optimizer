import { describe, it, expect } from 'vitest'
import { findName, redactPersonal, containsPersonal } from './personal'

const RESUME = [
  'Camille Moreau',
  'Ingénieure backend',
  'camille.moreau@example.com | +33 6 12 34 56 78 | Lyon, France',
  'linkedin.com/in/camille-moreau | GitHub: cmoreau-dev',
  'Date of birth 05/12/1995',
  'Expérience',
  'Ingénieure backend senior — Logistix, Lyon | 2022 – Présent',
  '• Migration vers Go, 09/2024 – 02/2026, latence divisée par 4',
  '• GitHub Actions et Twitter backend',
  'Signed: Camille Moreau, contact Moreau',
].join('\n')

describe('redactPersonal', () => {
  const { personal, text } = redactPersonal(RESUME)

  it('finds the details of the person, to fill the profile', () => {
    expect(personal).toEqual({
      full_name: 'Camille Moreau',
      email: 'camille.moreau@example.com',
      phone: '+33 6 12 34 56 78',
      linkedin: 'linkedin.com/in/camille-moreau',
    })
  })

  it('takes every one of them out of the text, wherever it is', () => {
    for (const secret of ['Camille', 'Moreau', 'camille.moreau@example.com', '+33 6 12 34 56 78', 'linkedin.com', 'cmoreau-dev', '05/12/1995']) {
      expect(text).not.toContain(secret)
    }
    expect(text).toContain('[name]')
    expect(text).toContain('[email] | [phone] | Lyon, France')
    expect(text).toContain('[link] | GitHub: [link]')
    expect(text).toContain('Date of birth [date of birth]')
  })

  it('leaves the rest of the resume as it is: dates, numbers, the names of tools', () => {
    expect(text).toContain('Ingénieure backend senior — Logistix, Lyon | 2022 – Présent')
    expect(text).toContain('• Migration vers Go, 09/2024 – 02/2026, latence divisée par 4')
    expect(text).toContain('• GitHub Actions et Twitter backend')
  })

  it('finds a "LinkedIn: handle" when there is no link', () => {
    expect(redactPersonal('Alex Durand\nLinkedIn : alexdurand\nalex.durand@example.com').personal.linkedin).toBe('alexdurand')
  })

  it('takes out the date and place of birth after "Né le"', () => {
    expect(redactPersonal('Né le ; 29/10/2006 à Toulouse').text).toBe('Né le [date of birth]')
  })

  it('finds nothing in a text without details, and changes nothing', () => {
    const plain = 'Expérience\nIngénieure backend — Logistix, Lyon | 2022 – 2024'
    expect(redactPersonal(plain)).toEqual({ personal: {}, text: plain })
  })
})

describe('findName', () => {
  it('takes the line whose words are in the email address, wherever it is', () => {
    expect(findName(['Skills', 'Go, Rust', 'Jules RODRIGUEZ'], 'jules-rodriguez@example.com')).toBe('Jules RODRIGUEZ')
    expect(findName(['Yusuf OZ EN'], 'yusuf.ozen@example.com')).toBe('Yusuf OZ EN')
  })

  it('else takes a short line of capitalised words at the top', () => {
    expect(findName(['Jérémy Gomes Cabral', 'Douvaine, France'], 'jg140@example.com')).toBe('Jérémy Gomes Cabral')
    expect(findName(['Jérémy Gomes Cabral'], undefined)).toBe('Jérémy Gomes Cabral')
  })

  it('does not take a heading or a sentence for a name', () => {
    expect(findName(['Work experience at a large company', 'and the inner workings'], 'someone@example.com')).toBeUndefined()
  })
})

describe('containsPersonal', () => {
  it('finds an email, a link, a phone number, a date of birth and the placeholders', () => {
    for (const text of ['write to a@b.co', 'see linkedin.com/in/someone', 'github.com/x/y', 'call +33 6 12 34 56 78', 'Born on 05/12/2003', 'I am [name]', 'at [email]', 'https://example.com', 'www.example.com', 'LinkedIn: JeremyGomes']) {
      expect(containsPersonal(text), text).toBe(true)
    }
  })

  it('leaves an ordinary profile alone: names of roles, technologies, years and figures', () => {
    for (const text of ['Platform Engineer', 'Engineering student with experience in Go, Kubernetes and CI/CD. GitHub Actions, 3 years, 99.9% uptime, since 2023.', 'Cut build time by 40% for 1200 users', 'Software Engineer — Systems & Networking']) {
      expect(containsPersonal(text), text).toBe(false)
    }
  })
})
