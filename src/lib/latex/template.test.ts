/**
 * template.test.ts
 *
 * Tests for src/lib/latex/template.ts
 *
 * renderEntityFromTemplate is pure and tested directly.
 * injectEntities reads real data/resume/ files so it's tested as an integration
 * smoke test (requires the section + entity template files to exist).
 */

import { describe, it, expect } from 'vitest'
import { renderEntityFromTemplate } from './template'
import type { ExperienceMeta, ProjectMeta, SkillMeta, EducationMeta } from '@/types'

// ── renderEntityFromTemplate ──────────────────────────────────────────────────

describe('renderEntityFromTemplate — experiences', () => {
  const entity: ExperienceMeta = {
    id: 'exp-001',
    type: 'experiences',
    title: 'Software Engineer',
    company: 'Acme Corp',
    period: 'Jan 2024 – Now',
    description: 'Built APIs and services',
    tags: ['Node.js'],
    latex_snippet: '\\item FALLBACK',
  }

  it('substitutes all experience placeholders', () => {
    const tpl = '{{title}} at {{company}} ({{period}}): {{description}}'
    const result = renderEntityFromTemplate(entity, tpl)
    expect(result).toBe('Software Engineer at Acme Corp (Jan 2024 – Now): Built APIs and services')
  })

  it('substitutes the same placeholder multiple times', () => {
    const tpl = '{{title}} — {{title}}'
    const result = renderEntityFromTemplate(entity, tpl)
    expect(result).toBe('Software Engineer — Software Engineer')
  })

  it('falls back to latex_snippet when template is empty', () => {
    expect(renderEntityFromTemplate(entity, '')).toBe('\\item FALLBACK')
    expect(renderEntityFromTemplate(entity, '   ')).toBe('\\item FALLBACK')
  })
})

describe('renderEntityFromTemplate — projects', () => {
  const entity: ProjectMeta = {
    id: 'proj-001',
    type: 'projects',
    title: 'My App',
    tech: ['TypeScript', 'React'],
    description: 'A cool project',
    tags: ['web'],
    latex_snippet: '\\item PROJECT FALLBACK',
  }

  it('substitutes all project placeholders', () => {
    const tpl = '{{title}} using {{tech}}: {{description}}'
    const result = renderEntityFromTemplate(entity, tpl)
    expect(result).toBe('My App using TypeScript, React: A cool project')
  })

  it('joins tech array with comma and space', () => {
    const tpl = '{{tech}}'
    expect(renderEntityFromTemplate(entity, tpl)).toBe('TypeScript, React')
  })
})

describe('renderEntityFromTemplate — skills', () => {
  const entity: SkillMeta = {
    id: 'skil-001',
    type: 'skills',
    name: 'Rust',
    category: 'Languages',
    level: 'advanced',
    tags: ['systems', 'embedded'],
    latex_snippet: '\\item SKILL FALLBACK',
  }

  it('substitutes all skill placeholders', () => {
    const tpl = '{{name}} ({{category}}, {{level}}): {{tags}}'
    const result = renderEntityFromTemplate(entity, tpl)
    expect(result).toBe('Rust (Languages, advanced): systems, embedded')
  })

  it('joins tags array with comma and space', () => {
    const tpl = '{{tags}}'
    expect(renderEntityFromTemplate(entity, tpl)).toBe('systems, embedded')
  })
})

describe('renderEntityFromTemplate — education', () => {
  const entity: EducationMeta = {
    id: 'edu-001',
    type: 'education',
    degree: 'MSc Computer Engineering',
    institution: 'EPITA',
    period: '2022 – 2024',
    tags: [],
    latex_snippet: '\\item EDU FALLBACK',
  }

  it('substitutes all education placeholders', () => {
    const tpl = '{{degree}} at {{institution}} ({{period}})'
    const result = renderEntityFromTemplate(entity, tpl)
    expect(result).toBe('MSc Computer Engineering at EPITA (2022 – 2024)')
  })

  it('leaves unknown placeholders intact', () => {
    const tpl = '{{degree}} — {{unknown}}'
    const result = renderEntityFromTemplate(entity, tpl)
    expect(result).toBe('MSc Computer Engineering — {{unknown}}')
  })
})

describe('renderEntityFromTemplate — LaTeX escaping', () => {
  it('escapes % in description', () => {
    const entity: ExperienceMeta = {
      id: 'exp-002', type: 'experiences', title: 'Intern', company: 'Corp',
      period: '2025', description: 'Reduced by 70% cost', tags: [], latex_snippet: '',
    }
    const result = renderEntityFromTemplate(entity, '{{description}}')
    expect(result).toBe('Reduced by 70\\% cost')
  })

  it('escapes & in category', () => {
    const entity: SkillMeta = {
      id: 'skil-002', type: 'skills', name: 'Skill', category: 'Systems & Low-level',
      level: 'advanced', tags: [], latex_snippet: '',
    }
    const result = renderEntityFromTemplate(entity, '{{category}}')
    expect(result).toBe('Systems \\& Low-level')
  })

  it('escapes _ in project description', () => {
    const entity: ProjectMeta = {
      id: 'proj-002', type: 'projects', title: 'Driver',
      tech: [], description: 'Uses pivot_root syscall', tags: [], latex_snippet: '',
    }
    const result = renderEntityFromTemplate(entity, '{{description}}')
    expect(result).toBe('Uses pivot\\_root syscall')
  })

  it('does not escape latex_snippet fallback', () => {
    const entity: ExperienceMeta = {
      id: 'exp-003', type: 'experiences', title: 'T', company: 'C',
      period: 'P', description: 'D', tags: [], latex_snippet: '\\item \\textbf{T}',
    }
    expect(renderEntityFromTemplate(entity, '')).toBe('\\item \\textbf{T}')
  })
})
