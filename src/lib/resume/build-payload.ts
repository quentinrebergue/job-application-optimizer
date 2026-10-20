import type { EducationMeta, EntityMeta, ExperienceMeta, ProjectMeta, ResumeConfig, SkillMeta } from '@/types'
import type { ResumeProfile } from '@/schemas/resume-profile'
import { softBreaks } from './soft-breaks'
import { printedDescription } from '@/lib/description-variants'

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
  'profile_text' | 'resume_title' | 'skill_tag_overrides' | 'entity_description_overrides' | 'description_variant' | 'project_order' | 'experience_order' | 'show_project_tech'
>

/** The technologies printed under a project: a list of thirty would fill the one page. The library keeps them all (the AI reads them all). */
export const MAX_PROJECT_TECH = 8

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

// Month names, English and French, by their first letters ("jun", "juin", "févr." all read).
const MONTHS: [RegExp, number][] = [
  [/^jan/, 0], [/^f[eé]v?/, 1], [/^mar/, 2], [/^a?pr|^avr/, 3], [/^ma[iy]/, 4], [/^jun|^juin/, 5],
  [/^jul|^juil/, 6], [/^aug|^ao/, 7], [/^sep/, 8], [/^oct/, 9], [/^nov/, 10], [/^d[eé]c/, 11],
]

/**
 * Turns one date of a period ("01/2024", "2021", "Jun 2022", "Now") into a number that sorts chronologically: months
 * since year 0. Still-ongoing is Infinity (most recent) and anything unreadable is -Infinity (oldest), so a typo never
 * produces NaN and scrambles the order.
 */
function dateKey(raw: string): number {
  const date = raw.trim().toLowerCase()
  if (ONGOING.has(date)) return Infinity

  const monthYear = /^(\d{1,2})\/(\d{4})$/.exec(date)
  if (monthYear) {
    const month = Number(monthYear[1])
    return month >= 1 && month <= 12 ? Number(monthYear[2]) * 12 + month - 1 : -Infinity
  }

  const yearOnly = /^(\d{4})$/.exec(date)
  if (yearOnly) return Number(yearOnly[1]) * 12 // a bare year counts as January

  const named = /^([a-zéû]+)\.?\s+(\d{4})$/.exec(date)
  const month = named ? MONTHS.find(([name]) => name.test(named[1])) : undefined
  if (named && month) return Number(named[2]) * 12 + month[1]

  return -Infinity
}

/** The end of a period ("01/2024 - Now", "2021 – 2026", "03/2022"); a single date is its own end. */
export function endDateKey(period: string): number {
  const parts = period.split(RANGE_SEPARATOR)
  return dateKey(parts[parts.length - 1])
}

/** The start of a period; a single date is its own start. */
export function startDateKey(period: string): number {
  return dateKey(period.split(RANGE_SEPARATOR)[0])
}

/**
 * Orders two periods, most recent first: what is still going on, then the later start, then the later end (#295).
 * The start decides because two roles that overlap (a freelance work during a degree) read best by when each began.
 * A period that cannot be read goes last; equal periods compare as equal.
 */
export function compareChronologically(a: string, b: string): number {
  const keys = (period: string) => [endDateKey(period) === Infinity ? 1 : 0, startDateKey(period), endDateKey(period)]
  const ka = keys(a)
  const kb = keys(b)
  for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return kb[i] > ka[i] ? 1 : -1
  return 0
}

/** Most recent first (see compareChronologically). Returns a new array; equal periods keep their input order. */
export function sortChronologically<T extends { period: string }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => compareChronologically(a.period, b.period))
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
      experiences: applyOrder(sortChronologically(experiences), config.experience_order).map((e) => ({
        title: softBreaks(e.title),
        company: softBreaks(e.company),
        location: softBreaks(e.location ?? ''),
        period: e.period,
        description: softBreaks(printedDescription(e, config)),
      })),
      projects: applyOrder(projects, config.project_order).map((p) => ({
        title: softBreaks(p.title),
        tech: config.show_project_tech === false ? [] : p.tech.slice(0, MAX_PROJECT_TECH).map(softBreaks),
        description: softBreaks(printedDescription(p, config)),
      })),
      skills: skills
        .map((s) => ({ name: softBreaks(s.name), tags: (tagOverrides[s.id] ?? s.tags).map(softBreaks) }))
        .filter((s) => s.tags.length > 0),
      education: sortChronologically(education).map((e) => ({
        degree: softBreaks(e.degree),
        institution: softBreaks(e.institution),
        period: e.period,
      })),
    },
  }
}
