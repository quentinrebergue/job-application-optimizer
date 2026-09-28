import fs from 'fs/promises'
import path from 'path'
import type { EntityMeta } from '@/types'
import { LATEX_PLACEHOLDER, ENTITY_SECTION_TYPES, type EntitySectionType } from '@/config'

const DATA_DIR = path.join(process.cwd(), 'data')
const SECTIONS_DIR = path.join(DATA_DIR, 'resume', 'sections')
const ENTITY_TEMPLATES_DIR = path.join(DATA_DIR, 'resume', 'entity-templates')

export async function getTemplate(): Promise<string> {
  return fs.readFile(path.join(DATA_DIR, 'resume', 'template.tex'), 'utf-8')
}

export async function saveTemplate(content: string): Promise<void> {
  await fs.writeFile(path.join(DATA_DIR, 'resume', 'template.tex'), content, 'utf-8')
}

// ── Section templates ────────────────────────────────────────────────────────

export async function getEntitySectionTemplate(type: EntitySectionType): Promise<string> {
  return fs.readFile(path.join(SECTIONS_DIR, `${type}.tex`), 'utf-8')
}

export async function saveEntitySectionTemplate(type: EntitySectionType, content: string): Promise<void> {
  await fs.mkdir(SECTIONS_DIR, { recursive: true })
  await fs.writeFile(path.join(SECTIONS_DIR, `${type}.tex`), content, 'utf-8')
}

export async function getAllSectionTemplates(): Promise<Record<EntitySectionType, string>> {
  const entries = await Promise.all(
    ENTITY_SECTION_TYPES.map(async (type) => {
      const content = await getEntitySectionTemplate(type).catch(() => '')
      return [type, content] as const
    })
  )
  return Object.fromEntries(entries) as Record<EntitySectionType, string>
}

// ── Entity templates ─────────────────────────────────────────────────────────

export async function getEntityTemplate(type: EntitySectionType): Promise<string> {
  return fs.readFile(path.join(ENTITY_TEMPLATES_DIR, `${type}.tex`), 'utf-8')
}

export async function saveEntityTemplate(type: EntitySectionType, content: string): Promise<void> {
  await fs.mkdir(ENTITY_TEMPLATES_DIR, { recursive: true })
  await fs.writeFile(path.join(ENTITY_TEMPLATES_DIR, `${type}.tex`), content, 'utf-8')
}

export async function getAllEntityTemplates(): Promise<Record<EntitySectionType, string>> {
  const entries = await Promise.all(
    ENTITY_SECTION_TYPES.map(async (type) => {
      const content = await getEntityTemplate(type).catch(() => '')
      return [type, content] as const
    })
  )
  return Object.fromEntries(entries) as Record<EntitySectionType, string>
}

/** Escape special LaTeX characters in plain-text field values. */
function escapeLatex(text: string): string {
  return text
    .replace(/%/g, '\\%')
    .replace(/&/g, '\\&')
    .replace(/#/g, '\\#')
    .replace(/\$/g, '\\$')
    .replace(/_/g, '\\_')
    .replace(/\^/g, '\\^{}')
    .replace(/~/g, '\\~{}')
}

/** Render a single entity by substituting {{field}} placeholders in a template.
 *  Falls back to entity.latex_snippet when template is empty. */
export function renderEntityFromTemplate(entity: EntityMeta, template: string, descriptionOverride?: string): string {
  if (!template.trim()) return entity.latex_snippet ?? ''

  let result = template
  const replace = (token: string, value: string) => {
    result = result.replace(new RegExp(`\\{\\{${token}\\}\\}`, 'g'), escapeLatex(value))
  }

  if (entity.type === 'experiences') {
    replace('title', entity.title)
    replace('company', entity.company)
    replace('location', entity.location ?? '')
    replace('period', entity.period)
    replace('description', descriptionOverride ?? entity.description)
  } else if (entity.type === 'projects') {
    replace('title', entity.title)
    replace('tech', entity.tech.join(', '))
    replace('description', descriptionOverride ?? entity.description)
  } else if (entity.type === 'skills') {
    replace('name', entity.name)
    replace('category', entity.category)
    replace('level', entity.level)
    replace('tags', entity.tags.join(', '))
  } else if (entity.type === 'education') {
    replace('degree', entity.degree)
    replace('institution', entity.institution)
    replace('period', entity.period)
  }

  return result.trimEnd()
}

// ── Main assembly ─────────────────────────────────────────────────────────────

export async function injectEntities(
  templateTex: string,
  entities: EntityMeta[],
  profileText?: string,
  skillTagOverrides?: Record<string, string[]>,
  projectOrder?: string[],
  resumeTitle?: string,
  entityDescriptionOverrides?: Record<string, string>,
  experienceOrder?: string[]
): Promise<string> {
  // Helper to sort by end date (most recent first)
  function parseEndDate(period: string): Date {
    const endPart = period.split('–')[1]?.trim() || period
    const parts = endPart.split('/').map(Number)
    
    if (parts.length === 2 && parts[0] && parts[1]) {
      // MM/YYYY format (for experiences: "02/2026")
      return new Date(parts[1], parts[0] - 1)
    } else {
      // YYYY format (for education: "2026")
      const year = parts[0] || parseInt(endPart)
      return new Date(year, 0)
    }
  }

  const byType = {
    experiences: (() => {
      const allExperiences = entities
        .filter((e) => e.type === 'experiences')
        .sort((a, b) => parseEndDate((b as any).period).getTime() - parseEndDate((a as any).period).getTime())
      if (!experienceOrder || experienceOrder.length === 0) return allExperiences
      // Sort by experienceOrder, keeping any unordered experiences (already date-sorted) at the end
      const ordered = experienceOrder
        .map((id) => allExperiences.find((e) => e.id === id))
        .filter((e) => e !== undefined) as EntityMeta[]
      const unordered = allExperiences.filter((e) => !experienceOrder.includes(e.id))
      return [...ordered, ...unordered]
    })(),
    projects: (() => {
      const allProjects = entities.filter((e) => e.type === 'projects')
      if (!projectOrder || projectOrder.length === 0) return allProjects
      // Sort by projectOrder, keeping any unordered projects at the end
      const ordered = projectOrder
        .map((id) => allProjects.find((p) => p.id === id))
        .filter((p) => p !== undefined) as EntityMeta[]
      const unordered = allProjects.filter((p) => !projectOrder.includes(p.id))
      return [...ordered, ...unordered]
    })(),
    skills: entities.filter((e) => e.type === 'skills'),
    education: entities
      .filter((e) => e.type === 'education')
      .sort((a, b) => parseEndDate((b as any).period).getTime() - parseEndDate((a as any).period).getTime()),
  }

  const DEFAULT_PROFILE = `\\textbf{Looking for a full-time position in software engineering with a focus on low-level systems / hardware integration.}\\\\[0.3em] MSc in Computer Engineering (EPITA - GISTRE) in Systems / Embedded.\\\\[0.3em]\nFluent in French and English (TOEIC 915, C1). \\textit{Interests: watchmaking, music, hiking/running, cooking.}`
  const DEFAULT_TITLE = 'Quentin Rebergue - Software Engineer'

  // Prepare profile text: escape and convert newlines to LaTeX
  const preparedProfileText = profileText?.trim()
    ? escapeLatex(profileText.trim()).replace(/\n/g, '\\\\[0.3em]\n')
    : DEFAULT_PROFILE

  // Prepare resume title: escape special LaTeX characters
  const preparedResumeTitle = resumeTitle?.trim()
    ? escapeLatex(resumeTitle.trim())
    : DEFAULT_TITLE

  let result = templateTex.replace(
    LATEX_PLACEHOLDER.RESUME_TITLE,
    preparedResumeTitle
  ).replace(
    LATEX_PLACEHOLDER.PROFILE,
    preparedProfileText
  )

  // Load all entity templates once
  const entityTemplates = await getAllEntityTemplates()

  // Replace section-level placeholders
  const sectionPlaceholders: Record<EntitySectionType, string> = {
    experiences: LATEX_PLACEHOLDER.EXPERIENCES_SECTION,
    projects: LATEX_PLACEHOLDER.PROJECTS_SECTION,
    skills: LATEX_PLACEHOLDER.SKILLS_SECTION,
    education: LATEX_PLACEHOLDER.EDUCATION_SECTION,
  }

  for (const type of ENTITY_SECTION_TYPES) {
    const placeholder = sectionPlaceholders[type]
    if (!result.includes(placeholder)) continue

    const entityTpl = entityTemplates[type]
    const items = byType[type]
      .map((e) => {
        // Apply skill tag overrides: render with only the selected tags
        if (e.type === 'skills' && skillTagOverrides?.[e.id]) {
          const overridden: typeof e = { ...e, tags: skillTagOverrides[e.id] }
          return renderEntityFromTemplate(overridden, entityTpl)
        }
        // Apply description overrides
        return renderEntityFromTemplate(e, entityTpl, entityDescriptionOverrides?.[e.id])
      })
      .join('\n\n')

    const sectionTex = await getEntitySectionTemplate(type).catch(() => null)
    const rendered = sectionTex
      ? sectionTex.replace(LATEX_PLACEHOLDER.ITEMS, items || `% No ${type} selected`)
      : items || `% No ${type} selected`

    result = result.replace(placeholder, rendered)
  }

  // Legacy fallback: item-level placeholders if still present
  result = result
    .replace(LATEX_PLACEHOLDER.EXPERIENCES, byType.experiences.map((e) => e.latex_snippet).join('\n\n') || '% No experiences selected')
    .replace(LATEX_PLACEHOLDER.PROJECTS, byType.projects.map((e) => e.latex_snippet).join('\n\n') || '% No projects selected')
    .replace(LATEX_PLACEHOLDER.SKILLS, byType.skills.map((e) => e.latex_snippet).join('\n\n') || '% No skills selected')
    .replace(LATEX_PLACEHOLDER.EDUCATION, byType.education.map((e) => e.latex_snippet).join('\n\n') || '% No education selected')

  return result
}

export async function saveGeneratedTex(jobId: string, tex: string): Promise<string> {
  const dir = path.join(DATA_DIR, 'jobs', jobId, 'generated')
  await fs.mkdir(dir, { recursive: true })
  const texPath = path.join(dir, 'resume.tex')
  await fs.writeFile(texPath, tex)
  return texPath
}
