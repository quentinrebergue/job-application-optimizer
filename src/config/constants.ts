// All magic values in one place. Never hardcode these elsewhere.

export const DEFAULT_QUESTION_COUNT = 20

export const APPLICATION_STATUSES = [
  'saved',
  'applied',
  'interview',
  'offer',
  'rejected',
] as const

export const APPLICATION_STATUS_LABELS: Record<string, string> = {
  saved: 'Saved',
  applied: 'Applied',
  interview: 'Interview',
  offer: 'Offer',
  rejected: 'Rejected',
}

export const APPLICATION_STATUS_COLORS: Record<string, string> = {
  saved: 'bg-slate-100 text-slate-700',
  applied: 'bg-blue-100 text-blue-700',
  interview: 'bg-yellow-100 text-yellow-700',
  offer: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
}

export const DIFFICULTY_LABELS: Record<string, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
}

export const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  hard: 'bg-red-100 text-red-700',
}

export const LATEX_PLACEHOLDER = {
  RESUME_TITLE: '%%RESUME_TITLE%%',
  PROFILE: '%%PROFILE%%',
  // Legacy item-level placeholders (kept for backward compat)
  EXPERIENCES: '%%EXPERIENCES%%',
  PROJECTS: '%%PROJECTS%%',
  SKILLS: '%%SKILLS%%',
  EDUCATION: '%%EDUCATION%%',
  // Section-level placeholders (used by section template files)
  EXPERIENCES_SECTION: '%%EXPERIENCES_SECTION%%',
  PROJECTS_SECTION: '%%PROJECTS_SECTION%%',
  SKILLS_SECTION: '%%SKILLS_SECTION%%',
  EDUCATION_SECTION: '%%EDUCATION_SECTION%%',
  // Per-section items placeholder (inside each section .tex file)
  ITEMS: '%%ITEMS%%',
} as const

export const ENTITY_SECTION_TYPES = ['experiences', 'projects', 'skills', 'education'] as const
export type EntitySectionType = (typeof ENTITY_SECTION_TYPES)[number]

/** Available {{placeholder}} tokens per entity type for entity-level templates */
export const ENTITY_TEMPLATE_FIELDS: Record<EntitySectionType, string[]> = {
  experiences: ['{{title}}', '{{company}}', '{{period}}', '{{description}}'],
  projects: ['{{title}}', '{{tech}}', '{{description}}'],
  skills: ['{{name}}', '{{category}}', '{{level}}', '{{tags}}'],
  education: ['{{degree}}', '{{institution}}', '{{period}}'],
}
