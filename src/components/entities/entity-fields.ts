// The fields of each kind of library entry, defined once: the creation form and
// the inline editor both render from here. Pure (no React), so it is tested.

import { LIMITS } from '@/config/limits'
import { tooLong } from '@/lib/text-limit'
import type { EducationMeta, EntityMeta, EntityType, ExperienceMeta, ProjectMeta, SkillMeta } from '@/types'

export type FieldKind = 'text' | 'textarea' | 'list' | 'select'

export interface FieldDef {
  key: string
  label: string
  kind: FieldKind
  required?: boolean
  placeholder?: string
  hint?: string
  options?: { value: string; label: string }[]
  /** Takes the full row width in a two-column grid */
  wide?: boolean
  /** Other keys saved with the same value (e.g. a project's technologies are also its tags) */
  mirrors?: string[]
  /** The most characters it takes (config/limits.ts); a list has its own limits instead */
  maxLength?: number
}

/** Keywords of an experience or a degree (tag taxonomy); not printed, not sent to the AI ranking. */
const KEYWORDS: FieldDef = {
  key: 'tags', label: 'Skills & technologies', kind: 'list', wide: true,
  placeholder: 'C, Linux, team lead', hint: 'Comma-separated keywords for this entry; they are not printed.',
}

export const ENTITY_FIELDS: Record<EntityType, FieldDef[]> = {
  experiences: [
    { key: 'title', label: 'Title', kind: 'text', required: true, placeholder: 'Software Engineer Intern', maxLength: LIMITS.experiences.title },
    { key: 'company', label: 'Company', kind: 'text', required: true, placeholder: 'Acme Corp', maxLength: LIMITS.experiences.company },
    { key: 'location', label: 'Location', kind: 'text', placeholder: 'Paris', maxLength: LIMITS.experiences.location },
    { key: 'period', label: 'Period', kind: 'text', placeholder: '06/2024 – 09/2024', maxLength: LIMITS.experiences.period },
    { key: 'description', label: 'Description', kind: 'textarea', wide: true, placeholder: 'Your role and what you achieved.', maxLength: LIMITS.experiences.description },
    KEYWORDS,
  ],
  projects: [
    { key: 'title', label: 'Title', kind: 'text', required: true, placeholder: 'Distributed Task Queue', maxLength: LIMITS.projects.title },
    // One list for a project: printed in the resume and matched by the AI (saved as its tags too).
    {
      key: 'tech', label: 'Technologies', kind: 'list', mirrors: ['tags'],
      placeholder: 'Python, Redis, Docker', hint: 'Comma-separated. Printed in the resume and used by the AI to match a job.',
    },
    { key: 'description', label: 'Description', kind: 'textarea', wide: true, placeholder: 'The project and your part in it.', maxLength: LIMITS.projects.description },
  ],
  skills: [
    { key: 'name', label: 'Name', kind: 'text', required: true, placeholder: 'Programming languages', maxLength: LIMITS.skills.name },
    { key: 'category', label: 'Category', kind: 'text', required: true, placeholder: 'Languages', maxLength: LIMITS.skills.category },
    {
      key: 'tags', label: 'Skills', kind: 'list', wide: true,
      placeholder: 'C, Rust, Go', hint: 'Comma-separated. Printed after the name of the group.',
    },
  ],
  education: [
    { key: 'degree', label: 'Degree', kind: 'text', required: true, placeholder: 'MSc Computer Engineering', maxLength: LIMITS.education.degree },
    { key: 'institution', label: 'Institution', kind: 'text', required: true, placeholder: 'EPITA', maxLength: LIMITS.education.institution },
    { key: 'period', label: 'Period', kind: 'text', placeholder: '2020 – 2026', maxLength: LIMITS.education.period },
    KEYWORDS,
  ],
}

export const TYPE_SINGULAR: Record<EntityType, string> = {
  experiences: 'Experience',
  projects: 'Project',
  skills: 'Skill',
  education: 'Education',
}

export type FieldValues = Record<string, string>

/** Form values (all strings; lists comma-joined) from an entry, or empty ones for a new entry. */
export function toValues(type: EntityType, entity?: Partial<EntityMeta>): FieldValues {
  const source = (entity ?? {}) as Record<string, unknown>
  const values: FieldValues = {}
  for (const field of ENTITY_FIELDS[type]) {
    const raw = source[field.key]
    if (field.kind === 'list') values[field.key] = Array.isArray(raw) ? raw.join(', ') : ''
    else if (field.kind === 'select') values[field.key] = typeof raw === 'string' ? raw : field.options?.[1]?.value ?? ''
    else values[field.key] = typeof raw === 'string' ? raw : ''
  }
  return values
}

export function parseList(raw: string): string[] {
  return raw.split(',').map((t) => t.trim()).filter(Boolean)
}

/** The API value of one field: lists become arrays, text is trimmed. */
export function fieldPayload(field: FieldDef, value: string): string | string[] {
  return field.kind === 'list' ? parseList(value) : value.trim()
}

/** The API body that saves one field, with the keys it mirrors. */
export function fieldUpdate(field: FieldDef, value: string): Record<string, string | string[]> {
  const payload = fieldPayload(field, value)
  return Object.fromEntries([field.key, ...(field.mirrors ?? [])].map((key) => [key, payload]))
}

/**
 * Values the API still requires but the app no longer asks for: a skill's level
 * is not shown anywhere (#65), so a new skill gets the neutral one.
 */
const NOT_ASKED: Partial<Record<EntityType, Record<string, string>>> = {
  skills: { level: 'intermediate' },
}

/** The API payload of a whole form (creation). */
export function toPayload(type: EntityType, values: FieldValues): Omit<ExperienceMeta | ProjectMeta | SkillMeta | EducationMeta, 'id' | 'type'> {
  const payload: Record<string, string | string[]> = { ...NOT_ASKED[type] }
  for (const field of ENTITY_FIELDS[type]) Object.assign(payload, fieldUpdate(field, values[field.key] ?? ''))
  return payload as unknown as Omit<ExperienceMeta, 'id' | 'type'>
}

/** What is wrong with a value, if anything: a required field left empty, or a text over its limit. */
export function fieldError(field: FieldDef, value: string): string | undefined {
  if (field.required && !value.trim()) return `Enter the ${field.label.toLowerCase()}.`
  return tooLong(value, field.maxLength)
}

/** Field errors of a whole form. */
export function fieldErrors(type: EntityType, values: FieldValues): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const field of ENTITY_FIELDS[type]) {
    const message = fieldError(field, values[field.key] ?? '')
    if (message) errors[field.key] = message
  }
  return errors
}

/** Title shown for an entry. */
export function entityTitle(e: EntityMeta): string {
  if (e.type === 'skills') return e.name
  if (e.type === 'education') return e.degree
  return e.title
}

/** Second line of an entry card: where and when, or the group of a skill (a project has none). */
export function entitySubtitle(e: EntityMeta): string {
  if (e.type === 'experiences') return [e.company, e.period].filter(Boolean).join(' · ')
  if (e.type === 'projects') return ''
  if (e.type === 'education') return [e.institution, e.period].filter(Boolean).join(' · ')
  return e.category
}

/** The chips of an entry card: a project's technologies, the others' tags. */
export function entityChips(e: EntityMeta): string[] {
  return e.type === 'projects' ? e.tech : e.tags
}
