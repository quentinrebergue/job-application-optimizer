import { describe, it, expect } from 'vitest'
import type { EducationMeta, EntityMeta, ExperienceMeta, ProjectMeta, SkillMeta } from '@/types'
import type { ResumeProfile } from '@/schemas/resume-profile'
import { MAX_PROJECT_TECH, applyOrder, buildPayload, endDateKey, sortChronologically, startDateKey } from './build-payload'

const ZWSP = '\u200B'

const profile: ResumeProfile = {
  full_name: 'Ada Lovelace',
  email: 'ada@example.com',
  linkedin: 'linkedin.com/in/ada',
  phone: '+33 6 00 00 00 00',
  address: 'Paris',
  resume_title: 'Site Reliability Engineer',
  profile_text: 'Default summary',
  ai_context: 'never sent to the renderer',
}

function experience(id: string, period: string, extra: Partial<ExperienceMeta> = {}): ExperienceMeta {
  return { id, type: 'experiences', title: `Role ${id}`, company: 'Acme', period, description: `About ${id}`, tags: [], ...extra }
}
function project(id: string, extra: Partial<ProjectMeta> = {}): ProjectMeta {
  return { id, type: 'projects', title: `Project ${id}`, tech: ['Go'], description: `About ${id}`, tags: [], ...extra }
}
function skill(id: string, tags: string[]): SkillMeta {
  return { id, type: 'skills', name: `Skill ${id}`, category: 'x', level: 'advanced', tags }
}
function education(id: string, period: string): EducationMeta {
  return { id, type: 'education', degree: `Degree ${id}`, institution: 'EPITA', period, tags: [] }
}

describe('endDateKey', () => {
  it('ranks ongoing periods above any date, whatever the separator', () => {
    for (const period of ['01/2024 - Now', '01/2024 – now', '2024 — Present', '2024-present', "03/2024 - Aujourd'hui", 'Jan 2024 - en cours']) {
      expect(endDateKey(period), period).toBe(Infinity)
    }
  })

  it('reads the end of month/year and year-only ranges', () => {
    expect(endDateKey('03/2022 - 09/2023')).toBe(2023 * 12 + 8)
    expect(endDateKey('03/2022–09/2023')).toBe(2023 * 12 + 8)
    expect(endDateKey('2021 – 2026')).toBe(2026 * 12)
    expect(endDateKey('2021 - 2026')).toBe(2026 * 12)
  })

  it('reads a single date', () => {
    expect(endDateKey('02/2026')).toBe(2026 * 12 + 1)
    expect(endDateKey('2023')).toBe(2023 * 12)
  })

  it('sends anything unreadable to the end instead of returning NaN', () => {
    for (const period of ['', 'summer', '13/2024', '2024 - someday']) {
      expect(endDateKey(period), period).toBe(-Infinity)
    }
  })
})

describe('sortChronologically', () => {
  it('puts the current job first, then newest to oldest', () => {
    const sorted = sortChronologically([
      experience('old', '2019 - 2020'),
      experience('now', '01/2024 - Now'),
      experience('mid', '2021 - 2022'),
    ])
    expect(sorted.map((e) => e.id)).toEqual(['now', 'mid', 'old'])
  })

  it('keeps input order for equal dates and unreadable ones', () => {
    const sorted = sortChronologically([experience('a', '2022'), experience('b', '2022'), experience('c', '???'), experience('d', 'n/a')])
    expect(sorted.map((e) => e.id)).toEqual(['a', 'b', 'c', 'd'])
  })

  it('does not mutate its input', () => {
    const input = [experience('old', '2019'), experience('new', '2024')]
    sortChronologically(input)
    expect(input.map((e) => e.id)).toEqual(['old', 'new'])
  })
})

describe('startDateKey', () => {
  it('reads the start of a range and a single date', () => {
    expect(startDateKey('03/2022 - 09/2023')).toBe(2022 * 12 + 2)
    expect(startDateKey('2021 – 2026')).toBe(2021 * 12)
    expect(startDateKey('02/2026')).toBe(2026 * 12 + 1)
  })

  it('reads month names, in English and French', () => {
    expect(startDateKey('Jun 2022 – Sep 2023')).toBe(2022 * 12 + 5)
    expect(startDateKey('June 2024 – August 2024')).toBe(2024 * 12 + 5)
    expect(endDateKey('June 2024 – August 2024')).toBe(2024 * 12 + 7)
    expect(startDateKey('Janv. 2023 – Août 2023')).toBe(2023 * 12)
    expect(endDateKey('Janv. 2023 – Août 2023')).toBe(2023 * 12 + 7)
    expect(endDateKey('juil 2023')).toBe(2023 * 12 + 6)
  })

  it('sends anything unreadable to the end', () => {
    for (const period of ['', 'summer', '13/2024', 'Foo 2024']) expect(startDateKey(period), period).toBe(-Infinity)
  })
})

describe('sortChronologically: the start date decides (#295)', () => {
  const ids = (periods: Record<string, string>) =>
    sortChronologically(Object.entries(periods).map(([id, period]) => experience(id, period))).map((e) => e.id)

  it('puts the current role first even when an older one ended later than it started', () => {
    expect(ids({ teach: '09/2024 – 02/2026', now: '02/2026 – Now' })).toEqual(['now', 'teach'])
  })

  it('puts the later start first when two roles overlap', () => {
    expect(ids({ degree: '2021 – 2025', freelance: '03/2023 – 2024' })).toEqual(['freelance', 'degree'])
  })

  it('breaks a tie on the start by the later end, and keeps input order for equal periods', () => {
    expect(ids({ short: '2022 – 2023', long: '2022 – 2025' })).toEqual(['long', 'short'])
    expect(ids({ a: '2022 – 2023', b: '2022 – 2023' })).toEqual(['a', 'b'])
  })

  it('puts several ongoing periods by their start, and an unreadable one last', () => {
    expect(ids({ bad: '???', recent: '2025 – Now', older: '2020 – Now', mid: '2023 – 2024' })).toEqual(['recent', 'older', 'mid', 'bad'])
  })
})

describe('applyOrder', () => {
  const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }]

  it('keeps the current order when no order is given', () => {
    expect(applyOrder(items).map((i) => i.id)).toEqual(['a', 'b', 'c', 'd'])
    expect(applyOrder(items, []).map((i) => i.id)).toEqual(['a', 'b', 'c', 'd'])
  })

  it('puts the listed ids first and the rest after, in their current order', () => {
    expect(applyOrder(items, ['c', 'a']).map((i) => i.id)).toEqual(['c', 'a', 'b', 'd'])
  })

  it('ignores unknown and repeated ids', () => {
    expect(applyOrder(items, ['zzz', 'b', 'b', 'c']).map((i) => i.id)).toEqual(['b', 'c', 'a', 'd'])
  })
})

describe('the technologies of a project on the resume', () => {
  const many = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']
  const withMany = [project('p1', { tech: many })]

  it('prints the first MAX_PROJECT_TECH, the library keeps them all', () => {
    const payload = buildPayload({ templateId: 'classic', profile, entities: withMany })
    expect(payload.sections.projects[0].tech).toEqual(many.slice(0, MAX_PROJECT_TECH))
    expect(MAX_PROJECT_TECH).toBe(8)
  })

  it('prints none when the user hid them for this job', () => {
    const payload = buildPayload({ templateId: 'classic', profile, entities: withMany, config: { show_project_tech: false } })
    expect(payload.sections.projects[0].tech).toEqual([])
  })

  it('prints them when the setting is true or absent', () => {
    expect(buildPayload({ templateId: 'classic', profile, entities: withMany, config: { show_project_tech: true } }).sections.projects[0].tech).toHaveLength(8)
  })
})

describe('buildPayload', () => {
  const entities: EntityMeta[] = [
    experience('e-old', '2019 - 2020'),
    experience('e-now', '01/2024 - Now', { location: 'Paris' }),
    project('p1'),
    project('p2', { tech: [] }),
    skill('s1', ['Go', 'TypeScript']),
    education('ed1', '2021 - 2026'),
  ]

  it('maps profile, template and sections to the renderer contract', () => {
    const payload = buildPayload({ templateId: 'classic', options: { fontSize: 11 }, profile, entities })

    expect(payload.schema_version).toBe(1)
    expect(payload.template).toEqual({ id: 'classic' })
    expect(payload.options).toEqual({ fontSize: 11 })
    expect(payload.profile).toEqual({
      name: 'Ada Lovelace',
      title: 'Site Reliability Engineer',
      email: 'ada@example.com',
      linkedin: 'linkedin.com/in/ada',
      phone: '+33 6 00 00 00 00',
      address: 'Paris',
      summary: 'Default summary',
    })
    expect(payload.sections.experiences.map((e) => e.title)).toEqual(['Role e-now', 'Role e-old'])
    expect(payload.sections.experiences[0].location).toBe('Paris')
    expect(payload.sections.experiences[1].location).toBe('')
    expect(payload.sections.projects).toHaveLength(2)
    expect(payload.sections.skills).toEqual([{ name: 'Skill s1', tags: ['Go', 'TypeScript'] }])
    expect(payload.sections.education).toEqual([{ degree: 'Degree ed1', institution: 'EPITA', period: '2021 - 2026' }])
  })

  it('never sends the AI context to the renderer', () => {
    expect(JSON.stringify(buildPayload({ templateId: 'classic', profile, entities }))).not.toContain('never sent')
  })

  it('prefers the job settings over the profile, and falls back when they are blank', () => {
    const job = buildPayload({ templateId: 'classic', profile, entities, config: { resume_title: ' Staff SRE ', profile_text: 'Job summary' } })
    expect(job.profile.title).toBe('Staff SRE')
    expect(job.profile.summary).toBe('Job summary')

    const blank = buildPayload({ templateId: 'classic', profile, entities, config: { resume_title: '   ', profile_text: '' } })
    expect(blank.profile.title).toBe('Site Reliability Engineer')
    expect(blank.profile.summary).toBe('Default summary')
  })

  it('applies experience and project order, then date order for the rest', () => {
    const payload = buildPayload({
      templateId: 'classic',
      profile,
      entities,
      config: { experience_order: ['e-old'], project_order: ['p2'] },
    })
    expect(payload.sections.experiences.map((e) => e.title)).toEqual(['Role e-old', 'Role e-now'])
    expect(payload.sections.projects.map((p) => p.title)).toEqual(['Project p2', 'Project p1'])
  })

  it('prints the experiences and the education by date whatever the order of the selection, and lets a custom order win', () => {
    const list: EntityMeta[] = [
      experience('teach', '09/2024 – 02/2026'),
      experience('now', '02/2026 – Now'),
      experience('old', '2019 - 2020'),
      education('msc', '2021 - 2023'),
      education('bsc', '2018 - 2021'),
    ]
    const printed = (config: object) => buildPayload({ templateId: 'classic', profile, entities: [...list].reverse(), config }).sections
    expect(printed({}).experiences.map((e) => e.title)).toEqual(['Role now', 'Role teach', 'Role old'])
    expect(printed({}).education.map((e) => e.degree)).toEqual(['Degree msc', 'Degree bsc'])
    expect(printed({ experience_order: ['teach', 'now'] }).experiences.map((e) => e.title)).toEqual(['Role teach', 'Role now', 'Role old'])
  })

  it('applies description overrides, including to a blank override', () => {
    const payload = buildPayload({
      templateId: 'classic',
      profile,
      entities,
      config: { entity_description_overrides: { 'e-now': 'Custom text', p1: '' } },
    })
    expect(payload.sections.experiences[0].description).toBe('Custom text')
    expect(payload.sections.experiences[1].description).toBe('About e-old')
    expect(payload.sections.projects.find((p) => p.title === 'Project p1')?.description).toBe('')
  })

  it('prints the version of a description a job chose, under the text written for the job, over the main one (#297)', () => {
    const versions = [
      project('pv', { descriptions: [{ name: 'Short', text: 'Short text' }, { name: 'Technical', text: 'Tech text' }] }),
    ]
    const text = (config: object) =>
      buildPayload({ templateId: 'classic', profile, entities: versions, config }).sections.projects[0].description
    expect(text({})).toBe('About pv')
    expect(text({ description_variant: { pv: 'Short' } })).toBe('Short text')
    expect(text({ description_variant: { pv: 'Short' }, entity_description_overrides: { pv: 'Mine' } })).toBe('Mine')
    // A version deleted or renamed since: the main description, not an empty line.
    expect(text({ description_variant: { pv: 'Gone' } })).toBe('About pv')
  })

  it('applies skill tag overrides and drops skills left without tags', () => {
    const twoSkills = [...entities, skill('s2', ['Rust']), skill('s3', [])]
    const payload = buildPayload({
      templateId: 'classic',
      profile,
      entities: twoSkills,
      config: { skill_tag_overrides: { s1: ['Go'], s2: [] } },
    })
    expect(payload.sections.skills).toEqual([{ name: 'Skill s1', tags: ['Go'] }])
  })

  it('produces plain JSON: no undefined, every list present', () => {
    const payload = buildPayload({ templateId: 'classic', profile, entities: [] })
    expect(JSON.parse(JSON.stringify(payload))).toEqual(payload)
    expect(payload.sections).toEqual({ experiences: [], projects: [], skills: [], education: [] })
    expect(payload.options).toEqual({})
  })

  it('does not modify the entities it is given', () => {
    const input = [experience('old', '2019'), experience('new', '2024')]
    const snapshot = structuredClone(input)
    buildPayload({ templateId: 'classic', profile, entities: input })
    expect(input).toEqual(snapshot)
  })
})

describe('buildPayload: entries saved without every field', () => {
  // What an import made before every field was written saved: no place, period, description, technologies or tags.
  const bare = {
    experiences: { id: 'e1', type: 'experiences', title: 'Stage technicien', company: 'Acme' },
    projects: { id: 'p1', type: 'projects', title: 'A project' },
    skills: { id: 's1', type: 'skills', name: 'Go', category: 'Languages', level: 'advanced' },
    education: { id: 'ed1', type: 'education', degree: 'Diplôme', institution: 'EPITA' },
  } as unknown as EntityMeta[]

  it('reads the missing fields as empty instead of failing: the PDF is still made', () => {
    const entities = Object.values(bare) as unknown as EntityMeta[]
    const payload = buildPayload({ templateId: 'classic', profile, entities })
    expect(payload.sections.experiences).toEqual([{ title: 'Stage technicien', company: 'Acme', location: '', period: '', description: '' }])
    expect(payload.sections.projects).toEqual([{ title: 'A project', tech: [], description: '' }])
    expect(payload.sections.skills).toEqual([])
    expect(payload.sections.education).toEqual([{ degree: 'Diplôme', institution: 'EPITA', period: '' }])
  })
})

describe('buildPayload: words too long for a line (the page is not overrun)', () => {
  const long = 'a'.repeat(120)

  it('adds break opportunities inside the long words of every free text, and only there', () => {
    const payload = buildPayload({
      templateId: 'compact',
      profile: { ...profile, full_name: long, resume_title: long, profile_text: long, address: long },
      entities: [
        experience('e1', '2024 - Now', { title: long, company: long, location: long, description: `Led ${long} teams` }),
        project('p1', { title: long, tech: [long, 'Go'], description: long }),
        skill('s1', [long, 'Go']),
        education('d1', '2020 - 2022'),
      ] as EntityMeta[],
    })
    const texts = [
      payload.profile.name, payload.profile.title, payload.profile.summary, payload.profile.address,
      payload.sections.experiences[0].title, payload.sections.experiences[0].company, payload.sections.experiences[0].location,
      payload.sections.experiences[0].description,
      payload.sections.projects[0].title, payload.sections.projects[0].tech[0], payload.sections.projects[0].description,
      payload.sections.skills[0].tags[0],
    ]
    for (const text of texts) expect(text).toContain(ZWSP)
    expect(payload.sections.projects[0].tech[1]).toBe('Go')
    expect(payload.sections.experiences[0].description.startsWith('Led ')).toBe(true)
    expect(payload.sections.experiences[0].description.endsWith(' teams')).toBe(true)
  })

  it('also breaks a description replaced for this job', () => {
    const payload = buildPayload({
      templateId: 'compact',
      profile,
      config: { entity_description_overrides: { e1: long } },
      entities: [experience('e1', '2024 - Now')] as EntityMeta[],
    })
    expect(payload.sections.experiences[0].description).toContain(ZWSP)
  })

  it('leaves the contact details exactly as they are: the e-mail and the LinkedIn address are the targets of links', () => {
    const payload = buildPayload({
      templateId: 'compact',
      profile: { ...profile, email: `${long}@example.com`, linkedin: `linkedin.com/in/${long}`, phone: long },
      entities: [],
    })
    expect(payload.profile.email).toBe(`${long}@example.com`)
    expect(payload.profile.linkedin).toBe(`linkedin.com/in/${long}`)
    expect(payload.profile.phone).toBe(long)
  })

  it('sends ordinary text untouched', () => {
    const payload = buildPayload({
      templateId: 'compact',
      profile,
      entities: [experience('e1', '2024 - Now', { description: 'Built a log subsystem and a gyroscope driver over I2C with FIFO reads.' })] as EntityMeta[],
    })
    expect(JSON.stringify(payload)).not.toContain(ZWSP)
  })
})
