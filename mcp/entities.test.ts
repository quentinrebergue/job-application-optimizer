import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import { createExperience, createProject, createSkill, createEducation, listEntities } from './entities.js'

let dataDir: string

beforeEach(async () => {
  dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mcp-entities-test-'))
  // pre-create entity subdirs (mimics the real data/ layout)
  await fs.mkdir(path.join(dataDir, 'entities', 'experiences'), { recursive: true })
  await fs.mkdir(path.join(dataDir, 'entities', 'projects'), { recursive: true })
  await fs.mkdir(path.join(dataDir, 'entities', 'skills'), { recursive: true })
  await fs.mkdir(path.join(dataDir, 'entities', 'education'), { recursive: true })
})

afterEach(async () => {
  await fs.rm(dataDir, { recursive: true, force: true })
})

describe('createExperience', () => {
  it('writes meta.json and questions.json', async () => {
    const e = await createExperience(dataDir, {
      title: 'SWE Intern',
      company: 'Acme',
      period: 'Jun 2025 – Aug 2025',
      description: 'Built APIs',
      tags: ['Node.js'],
    })
    expect(e.id).toMatch(/^exp-[0-9a-f]{8}$/)
    expect(e.type).toBe('experiences')
    expect(e.company).toBe('Acme')

    const raw = await fs.readFile(
      path.join(dataDir, 'entities', 'experiences', e.id, 'meta.json'), 'utf-8'
    )
    expect(JSON.parse(raw)).toMatchObject({ id: e.id, type: 'experiences', tags: ['Node.js'] })

    const q = await fs.readFile(
      path.join(dataDir, 'entities', 'experiences', e.id, 'questions.json'), 'utf-8'
    )
    expect(JSON.parse(q)).toEqual([])
  })

  it('defaults tags to [] and latex_snippet to empty string', async () => {
    const e = await createExperience(dataDir, {
      title: 'Dev', company: 'Co', period: '2025', description: 'Did things',
    })
    expect(e.tags).toEqual([])
    expect(e.latex_snippet).toBe('')
  })
})

describe('createProject', () => {
  it('writes meta.json with tech array', async () => {
    const p = await createProject(dataDir, {
      title: 'My App',
      tech: ['C++', 'CMake'],
      description: 'A fast trading engine',
    })
    expect(p.id).toMatch(/^proj-[0-9a-f]{8}$/)
    expect(p.type).toBe('projects')
    expect(p.tech).toEqual(['C++', 'CMake'])
  })
})

describe('createSkill', () => {
  it('writes meta.json with level', async () => {
    const s = await createSkill(dataDir, {
      name: 'C++',
      category: 'Languages',
      level: 'expert',
    })
    expect(s.id).toMatch(/^skil-[0-9a-f]{8}$/)
    expect(s.type).toBe('skills')
    expect(s.level).toBe('expert')
  })
})

describe('listEntities', () => {
  it('returns empty when no entities exist', async () => {
    expect(await listEntities(dataDir, 'experiences')).toEqual([])
  })

  it('returns all created entities of the requested type', async () => {
    await createExperience(dataDir, { title: 'A', company: 'X', period: '2025', description: 'd' })
    await createExperience(dataDir, { title: 'B', company: 'Y', period: '2024', description: 'd' })
    await createProject(dataDir, { title: 'P', tech: ['Go'], description: 'd' })

    const experiences = await listEntities(dataDir, 'experiences')
    expect(experiences).toHaveLength(2)
    expect(experiences.map((e) => e.type).every((t) => t === 'experiences')).toBe(true)

    const projects = await listEntities(dataDir, 'projects')
    expect(projects).toHaveLength(1)
  })

  it('ignores README.md and hidden entries', async () => {
    await fs.writeFile(path.join(dataDir, 'entities', 'skills', 'README.md'), '# Skills')
    await fs.mkdir(path.join(dataDir, 'entities', 'skills', '.hidden'), { recursive: true })
    await createSkill(dataDir, { name: 'Rust', category: 'Languages', level: 'intermediate' })

    const skills = await listEntities(dataDir, 'skills')
    expect(skills).toHaveLength(1)
  })
})

describe('createEducation', () => {
  it('writes meta.json and questions.json', async () => {
    const e = await createEducation(dataDir, {
      degree: 'MSc Computer Engineering',
      institution: 'EPITA',
      period: '2020 – 2026',
      tags: ['Systems', 'Embedded'],
    })
    expect(e.id).toMatch(/^edu-[0-9a-f]{8}$/)
    expect(e.type).toBe('education')
    expect(e.degree).toBe('MSc Computer Engineering')
    expect(e.institution).toBe('EPITA')
    expect(e.period).toBe('2020 – 2026')
    expect(e.tags).toEqual(['Systems', 'Embedded'])

    const raw = await fs.readFile(
      path.join(dataDir, 'entities', 'education', e.id, 'meta.json'), 'utf-8'
    )
    expect(JSON.parse(raw)).toMatchObject({ id: e.id, type: 'education', degree: 'MSc Computer Engineering' })

    const q = await fs.readFile(
      path.join(dataDir, 'entities', 'education', e.id, 'questions.json'), 'utf-8'
    )
    expect(JSON.parse(q)).toEqual([])
  })

  it('defaults tags to [] and latex_snippet to empty string', async () => {
    const e = await createEducation(dataDir, {
      degree: 'BSc',
      institution: 'University X',
      period: '2018 – 2021',
    })
    expect(e.tags).toEqual([])
    expect(e.latex_snippet).toBe('')
  })

  it('lists education entities', async () => {
    await createEducation(dataDir, { degree: 'MSc', institution: 'EPITA', period: '2020-2026' })
    await createEducation(dataDir, { degree: 'PTSI', institution: 'Jules Ferry', period: '2019-2020' })

    const results = await listEntities(dataDir, 'education')
    expect(results).toHaveLength(2)
    expect(results.every((e) => e.type === 'education')).toBe(true)
  })
})
