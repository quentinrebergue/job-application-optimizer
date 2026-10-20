import { describe, it, expect } from 'vitest'
import { fileNameFromDisposition, resumeFileName } from './file-name'

const name = (extra: Partial<Parameters<typeof resumeFileName>[0]> = {}) =>
  resumeFileName({ fullName: 'Quentin Rebergue', company: 'Dust', title: 'Backend Engineer', ...extra })

describe('resumeFileName', () => {
  it('names the file after the person and the company', () => {
    expect(name()).toBe('resume_quentin.rebergue_dust.pdf')
  })

  it('removes accents, spaces and every character a file system refuses', () => {
    expect(name({ fullName: 'Éloïse Du Pré', company: 'Société Générale / Paris: "SG"?' })).toBe('resume_eloise.du-pre_societe-generale-paris-sg.pdf')
    expect(name({ company: 'A\\B*C|D<E>F' })).toBe('resume_quentin.rebergue_a-b-c-d-e-f.pdf')
    expect(name({ company: '../../etc/passwd' })).toBe('resume_quentin.rebergue_etc-passwd.pdf')
  })

  it('keeps the last name whole, even in several words or with a hyphen', () => {
    expect(name({ fullName: 'Jean-Pierre de La Fontaine' })).toBe('resume_jean-pierre.de-la-fontaine_dust.pdf')
    expect(name({ fullName: '  Madonna ' })).toBe('resume_madonna_dust.pdf')
  })

  it('leaves out what is missing, and falls back on resume.pdf when nothing is left', () => {
    expect(name({ company: '' })).toBe('resume_quentin.rebergue.pdf')
    expect(name({ fullName: '' })).toBe('resume_dust.pdf')
    expect(name({ fullName: '', company: '' })).toBe('resume.pdf')
    // Nothing a file name can hold survives: same as nothing.
    expect(name({ fullName: '你好', company: '!!!' })).toBe('resume.pdf')
  })

  it('adds the first words of the job title only when another job is at the same company', () => {
    expect(name({ title: 'Senior Backend Engineer (Paris)' })).toBe('resume_quentin.rebergue_dust.pdf')
    expect(name({ title: 'Senior Backend Engineer (Paris)', sharesCompany: true })).toBe('resume_quentin.rebergue_dust_senior-backend-engineer.pdf')
    expect(name({ title: '', sharesCompany: true })).toBe('resume_quentin.rebergue_dust.pdf')
  })

  it('cuts every part, so a long name stays far under the limit of a file system', () => {
    const long = name({ fullName: `${'a'.repeat(100)} ${'b'.repeat(100)}`, company: 'c'.repeat(200), title: 'd'.repeat(200), sharesCompany: true })
    expect(long).toMatch(/^resume_a{30}\.b{30}_c{30}_d{30}\.pdf$/)
    expect(long.length).toBeLessThan(150)
  })
})

describe('fileNameFromDisposition', () => {
  it('reads the name the server announced', () => {
    expect(fileNameFromDisposition('attachment; filename="resume_ada.lovelace_acme.pdf"')).toBe('resume_ada.lovelace_acme.pdf')
  })

  it('falls back on resume.pdf when there is none, or one with a path', () => {
    expect(fileNameFromDisposition(null)).toBe('resume.pdf')
    expect(fileNameFromDisposition('attachment')).toBe('resume.pdf')
    expect(fileNameFromDisposition('attachment; filename="../x.pdf"')).toBe('resume.pdf')
  })
})
