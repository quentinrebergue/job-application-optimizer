import type { EducationMeta, EntityMeta, ExperienceMeta, ProjectMeta, ResumeConfig, SkillMeta } from '@/types'
import type { ResumeProfile } from '@/schemas/resume-profile'
import { softBreaks } from './soft-breaks'

/**
 * The JSON sent to the resume-renderer service (POST /render). It mirrors the
 * Go model in services/resume-renderer/internal/model: every field is present
 * (empty string / empty array rather than undefined) and lists are already
 * selected, ordered and overridden, so the service only has to draw. The free text gets break opportunities
 * inside the words too long to fit a line (soft-breaks.ts); the contact details are left exactly as they are, since
 * the e-mail and the LinkedIn address are also the targets of links.
 */
export interface RenderPayload {
  schema_version: 1
  template: { id: string }
  options: Record<string, string | number>
  profile: {
    name: string
    title: string
    email: string
    linkedin: string
    phone: string
    address: string
    summary: string
  }
  sections: {
    experiences: { title: string; company: string; location: string; period: string; description: string }[]
    projects: { title: string; tech: string[]; description: string }[]
    skills: { name: string; tags: string[] }[]
    education: { degree: string; institution: string; period: string }[]
  }
}

export type PayloadConfig = Pick<
  ResumeConfig,
  'profile_text' | 'resume_title' | 'skill_tag_overrides' | 'entity_description_overrides' | 'project_order' | 'experience_order'
>

export interface BuildPayloadInput {
  templateId: string
  options?: Record<string, string | number>
  /** The user's saved profile: name and contact details, plus fallbacks for title and summary. */
  profile: ResumeProfile
  /** Per-job settings. Absent or blank values fall back to the profile / default order. */
  config?: Partial<PayloadConfig>
  /** The entities to show (already filtered to the selection), in any order. */
  entities: readonly EntityMeta[]
}

// ── Ordering ──────────────────────────────────────────────────────────────────

const ONGOING = new Set(['now', 'present', 'current', 'ongoing', 'today', 'présent', "aujourd'hui", 'en cours'])

// En dash, em dash or hyphen, with or without spaces around it.
const RANGE_SEPARATOR = /\s*[–—-]\s*/

/**
 * Turns the end of a period ("01/2024 - Now", "2021 – 2026", "03/2022") into a
 * number that sorts chronologically. Still-ongoing periods are Infinity (most
 * recent) and anything unreadable is -Infinity (oldest), so a typo never
 * produces NaN and scrambles the order.
 */
export function endDateKey(period: string): number {
  const parts = period.split(RANGE_SEPARATOR)
  const end = parts[parts.length - 1].trim().toLowerCase()

  if (ONGOING.has(end)) return Infinity

  const monthYear = /^(\d{1,2})\/(\d{4})$/.exec(end)
  if (monthYear) {
    const month = Number(monthYear[1])
    return month >= 1 && month <= 12 ? Number(monthYear[2]) * 12 + month - 1 : -Infinity
  }

  const yearOnly = /^(\d{4})$/.exec(end)
  if (yearOnly) return Number(yearOnly[1]) * 12 // a bare year counts as January

  return -Infinity
}

/** Most recent first. Returns a new array; equal dates keep their input order. */
export function sortByEndDate<T extends { period: string }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => {
    const ka = endDateKey(a.period)
    const kb = endDateKey(b.period)
    return ka === kb ? 0 : kb > ka ? 1 : -1
  })
}

/**
 * Puts the items named in `order` first, in that order, then the rest in their
 * current order. Unknown and repeated ids are ignored.
 */
export function applyOrder<T extends { id: string }>(items: readonly T[], order?: readonly string[]): T[] {
  if (!order || order.length === 0) return [...items]

  const byId = new Map(items.map((item) => [item.id, item]))
  const placed = new Set<string>()
  const first: T[] = []
  for (const id of order) {
    const item = byId.get(id)
    if (item && !placed.has(id)) {
      first.push(item)
      placed.add(id)
    }
  }
  return [...first, ...items.filter((item) => !placed.has(item.id))]
}

// ── Payload ───────────────────────────────────────────────────────────────────

export function buildPayload(input: BuildPayloadInput): RenderPayload {
  const { profile, config = {}, entities } = input
  const descriptionOverrides = config.entity_description_overrides ?? {}
  const tagOverrides = config.skill_tag_overrides ?? {}

  // An entry saved without every field (an import made before they were all written) reads as empty, not as a crash.
  const experiences = entities
    .filter((e): e is ExperienceMeta => e.type === 'experiences')
    .map((e) => ({ ...e, location: e.location ?? '', period: e.period ?? '', description: e.description ?? '' }))
  const projects = entities
    .filter((e): e is ProjectMeta => e.type === 'projects')
    .map((p) => ({ ...p, tech: p.tech ?? [], description: p.description ?? '' }))
  const skills = entities.filter((e): e is SkillMeta => e.type === 'skills').map((s) => ({ ...s, tags: s.tags ?? [] }))
  const education = entities
    .filter((e): e is EducationMeta => e.type === 'education')
    .map((e) => ({ ...e, period: e.period ?? '' }))

  return {
    schema_version: 1,
    template: { id: input.templateId },
    options: input.options ?? {},
    profile: {
      name: softBreaks(profile.full_name),
      title: softBreaks(config.resume_title?.trim() || profile.resume_title),
      email: profile.email,
      linkedin: profile.linkedin,
      phone: profile.phone,
      address: softBreaks(profile.address),
      summary: softBreaks(config.profile_text?.trim() || profile.profile_text),
    },
    sections: {
      experiences: applyOrder(sortByEndDate(experiences), config.experience_order).map((e) => ({
        title: softBreaks(e.title),
        company: softBreaks(e.company),
        location: softBreaks(e.location ?? ''),
        period: e.period,
        description: softBreaks(descriptionOverrides[e.id] ?? e.description),
      })),
      projects: applyOrder(projects, config.project_order).map((p) => ({
        title: softBreaks(p.title),
        tech: p.tech.map(softBreaks),
        description: softBreaks(descriptionOverrides[p.id] ?? p.description),
      })),
      skills: skills
        .map((s) => ({ name: softBreaks(s.name), tags: (tagOverrides[s.id] ?? s.tags).map(softBreaks) }))
        .filter((s) => s.tags.length > 0),
      education: sortByEndDate(education).map((e) => ({
        degree: softBreaks(e.degree),
        institution: softBreaks(e.institution),
        period: e.period,
      })),
    },
  }
}
