import { z } from 'zod'
import { ApplicationStatusSchema } from './job'
import { LIMITS } from '@/config/limits'

// What the API accepts in a request body (#201): a shape and a size for every field.
// Unknown keys are dropped, so nothing the app does not know is written to the database.
// An update carries any of the fields; an absent one is left as it is. There are no
// `.default()`s on purpose: on an update they would write the default over what is saved.

/** Text, trimmed, at most `max` characters. */
const text = (max: number) => z.string().trim().max(max)
/** Text that must not be empty (a title, a company...). */
const required = (max: number) => text(max).min(1)

/** The other versions of a description (#297): a name and a text, at most a few. */
const descriptionVariants = (descriptionMax: number) =>
  z
    .array(z.object({ name: required(LIMITS.descriptionVariants.name), text: text(descriptionMax) }))
    .max(LIMITS.descriptionVariants.perEntry)

const tagList = z.array(z.string().trim().min(1).max(LIMITS.tag)).max(LIMITS.tagsPerEntry)
const latex = text(LIMITS.latexSnippet)

// Entries of the library: the fields the forms ask for (src/components/entities/entity-fields.ts).
const entityShapes = {
  experiences: {
    title: required(LIMITS.experiences.title),
    company: required(LIMITS.experiences.company),
    location: text(LIMITS.experiences.location).optional(),
    period: text(LIMITS.experiences.period).optional(),
    description: text(LIMITS.experiences.description).optional(),
    descriptions: descriptionVariants(LIMITS.experiences.description).optional(),
    tags: tagList.optional(),
    latex_snippet: latex.optional(),
  },
  projects: {
    title: required(LIMITS.projects.title),
    tech: tagList.optional(),
    description: text(LIMITS.projects.description).optional(),
    descriptions: descriptionVariants(LIMITS.projects.description).optional(),
    tags: tagList.optional(),
    latex_snippet: latex.optional(),
  },
  skills: {
    name: required(LIMITS.skills.name),
    // No longer asked (the name says it); an older client or entry may still send it.
    category: text(LIMITS.skills.category).optional(),
    level: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).optional(),
    tags: tagList.optional(),
    latex_snippet: latex.optional(),
  },
  education: {
    degree: required(LIMITS.education.degree),
    institution: required(LIMITS.education.institution),
    period: text(LIMITS.education.period).optional(),
    tags: tagList.optional(),
    latex_snippet: latex.optional(),
  },
} as const

export const EntityCreateSchemas = {
  experiences: z.object(entityShapes.experiences),
  projects: z.object(entityShapes.projects),
  skills: z.object(entityShapes.skills),
  education: z.object(entityShapes.education),
}

/** The body of POST /api/entities: the kind, then that kind's fields. */
export const EntityCreateSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('experiences'), ...entityShapes.experiences }),
  z.object({ type: z.literal('projects'), ...entityShapes.projects }),
  z.object({ type: z.literal('skills'), ...entityShapes.skills }),
  z.object({ type: z.literal('education'), ...entityShapes.education }),
])

export const EntityUpdateSchemas = {
  experiences: z.object(entityShapes.experiences).partial(),
  projects: z.object(entityShapes.projects).partial(),
  skills: z.object(entityShapes.skills).partial(),
  education: z.object(entityShapes.education).partial(),
}

// Job offers.
const jobShape = {
  title: required(LIMITS.job.title),
  company: required(LIMITS.job.company),
  description: text(LIMITS.job.description),
  location: text(LIMITS.job.location).optional(),
  url: text(LIMITS.job.url).optional(),
  status: ApplicationStatusSchema,
  tags: tagList.optional(),
}

/** A new offer needs a text; once saved, the description may be emptied while editing. */
export const JobCreateSchema = z.object({ ...jobShape, description: required(LIMITS.job.description) })
export const JobUpdateSchema = z.object(jobShape).partial()

// The resume of one job. A whole document, saved at once: what a client had before is
// replaced by what it sends. Old values stay readable; only what is sent is checked.
const id = z.string().max(LIMITS.resume.id)
const ids = z.array(id).max(LIMITS.resume.items)

export const ResumeConfigInputSchema = z.object({
  selected_entity_ids: ids,
  // The AI's old scores are only kept as they were: a loose number, not checked against a range.
  ai_rankings: z.array(z.object({ entity_id: id, score: z.number() })).max(LIMITS.resume.items),
  profile_text: text(LIMITS.profile.profile_text).default(''),
  resume_title: text(LIMITS.profile.resume_title).optional(),
  ai_context: text(LIMITS.profile.ai_context).optional(),
  ai_applied_at: z.string().max(LIMITS.resume.id).optional(),
  show_project_tech: z.boolean().optional(),
  description_variant: z.record(id, text(LIMITS.descriptionVariants.name)).optional(),
  skill_tag_overrides: z.record(id, tagList).optional(),
  entity_description_overrides: z.record(id, text(LIMITS.resume.entityDescription)).optional(),
  project_order: ids.optional(),
  experience_order: ids.optional(),
  resume_template: z.string().max(LIMITS.resume.id).optional(),
  resume_options: z
    .record(z.string().max(LIMITS.resume.optionKeys), z.union([z.string().max(LIMITS.resume.optionValue), z.number()]))
    .refine((o) => Object.keys(o).length <= LIMITS.resume.optionKeys, { error: 'Too many options' })
    .optional(),
})

/** The confirmation to delete an account: the address of the account typed again, and its password (#104). */
export const DeleteAccountSchema = z.object({
  email: z.string().trim().max(254),
  password: z.string().min(1, { error: 'Enter your password.' }).max(1000),
})

/** The password, asked again before a copy of the data is given (#104). */
export const ExportAccountSchema = z.object({ password: z.string().min(1, { error: 'Enter your password.' }).max(1000) })

/** The password of an account changes: the current one, and the new one (its rules are those of the sign-up, checked in the lib). */
export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, { error: 'Enter your password.' }).max(1000),
  newPassword: z.string().max(1000),
})

/** The address of an account changes: the new one (checked in the lib), and the password. */
export const ChangeEmailSchema = z.object({
  email: z.string().trim().max(254),
  password: z.string().min(1, { error: 'Enter your password.' }).max(1000),
})
