import fs from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'

export type EntityType = 'experiences' | 'projects' | 'skills' | 'education'
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert'

export interface ExperienceMeta {
  id: string
  type: 'experiences'
  title: string
  company: string
  period: string
  description: string
  tags: string[]
  latex_snippet: string
}

export interface ProjectMeta {
  id: string
  type: 'projects'
  title: string
  tech: string[]
  description: string
  tags: string[]
  latex_snippet: string
}

export interface SkillMeta {
  id: string
  type: 'skills'
  name: string
  category: string
  level: SkillLevel
  tags: string[]
  latex_snippet: string
}

export type EntityMeta = ExperienceMeta | ProjectMeta | SkillMeta | EducationMeta

export interface EducationMeta {
  id: string
  type: 'education'
  degree: string
  institution: string
  period: string
  tags: string[]
  latex_snippet: string
}

function entityTypeDir(dataDir: string, type: EntityType): string {
  return path.join(dataDir, 'entities', type)
}

async function writeEntity(
  dir: string,
  meta: EntityMeta,
  questions: Array<{ question: string; answer: string }> = []
): Promise<void> {
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(path.join(dir, 'meta.json'), JSON.stringify(meta, null, 2))
  await fs.writeFile(path.join(dir, 'questions.json'), JSON.stringify(questions, null, 2))
}

export async function createExperience(
  dataDir: string,
  opts: { title: string; company: string; period: string; description: string; tags?: string[]; latex_snippet?: string }
): Promise<ExperienceMeta> {
  const id = `exp-${randomUUID().slice(0, 8)}`
  const meta: ExperienceMeta = {
    id,
    type: 'experiences',
    title: opts.title.trim(),
    company: opts.company.trim(),
    period: opts.period.trim(),
    description: opts.description.trim(),
    tags: opts.tags ?? [],
    latex_snippet: opts.latex_snippet ?? '',
  }
  await writeEntity(path.join(entityTypeDir(dataDir, 'experiences'), id), meta)
  return meta
}

export async function createProject(
  dataDir: string,
  opts: {
    title: string
    tech: string[]
    description: string
    tags?: string[]
    latex_snippet?: string
    questions?: Array<{ question: string; answer: string }>
  }
): Promise<ProjectMeta> {
  const id = `proj-${randomUUID().slice(0, 8)}`
  const meta: ProjectMeta = {
    id,
    type: 'projects',
    title: opts.title.trim(),
    tech: opts.tech,
    description: opts.description.trim(),
    tags: opts.tags ?? [],
    latex_snippet: opts.latex_snippet ?? '',
  }
  await writeEntity(path.join(entityTypeDir(dataDir, 'projects'), id), meta, opts.questions ?? [])
  return meta
}

export async function createSkill(
  dataDir: string,
  opts: { name: string; category: string; level: SkillLevel; tags?: string[]; latex_snippet?: string }
): Promise<SkillMeta> {
  const id = `skil-${randomUUID().slice(0, 8)}`
  const meta: SkillMeta = {
    id,
    type: 'skills',
    name: opts.name.trim(),
    category: opts.category.trim(),
    level: opts.level,
    tags: opts.tags ?? [],
    latex_snippet: opts.latex_snippet ?? '',
  }
  await writeEntity(path.join(entityTypeDir(dataDir, 'skills'), id), meta)
  return meta
}

export async function createEducation(
  dataDir: string,
  opts: { degree: string; institution: string; period: string; tags?: string[]; latex_snippet?: string }
): Promise<EducationMeta> {
  const id = `edu-${randomUUID().slice(0, 8)}`
  const meta: EducationMeta = {
    id,
    type: 'education',
    degree: opts.degree.trim(),
    institution: opts.institution.trim(),
    period: opts.period.trim(),
    tags: opts.tags ?? [],
    latex_snippet: opts.latex_snippet ?? '',
  }
  await writeEntity(path.join(entityTypeDir(dataDir, 'education'), id), meta)
  return meta
}

export async function listEntities(
  dataDir: string,
  type: EntityType
): Promise<EntityMeta[]> {
  const dir = entityTypeDir(dataDir, type)
  try {
    const entries = await fs.readdir(dir)
    const results = await Promise.all(
      entries
        .filter((e) => !e.startsWith('.') && e !== 'README.md')
        .map(async (id) => {
          try {
            const raw = await fs.readFile(path.join(dir, id, 'meta.json'), 'utf-8')
            return JSON.parse(raw) as EntityMeta
          } catch {
            return null
          }
        })
    )
    return results.filter((e): e is EntityMeta => e !== null)
  } catch {
    return []
  }
}
