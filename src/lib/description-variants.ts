import { LIMITS } from '@/config/limits'
import type { DescriptionVariant, EntityMeta } from '@/types'

// The other versions of the description of an experience or a project (#297): "Complete", "Short", "Technical"...
// The main description stays in `description` (it is what the AI reads, what an import writes and what a job
// prints when nothing else is chosen); the versions are extra texts the user picks from, job by job. Pure functions,
// shared by the form of the library, the panel of a job and the resume.

/** The versions of an entry; none for a kind that has no description. */
export function variantsOf(entity: Pick<EntityMeta, 'type'> & { descriptions?: DescriptionVariant[] }): DescriptionVariant[] {
  return (entity.type === 'experiences' || entity.type === 'projects') && Array.isArray(entity.descriptions) ? entity.descriptions : []
}

/**
 * The text a version stands for: the version named `name` if the entry still has it, else the main description (a
 * version deleted or renamed after a job chose it must not leave the job without a text).
 */
export function versionText(entity: EntityMeta, name: string | undefined): string {
  const description = (entity as { description?: string }).description ?? ''
  if (!name) return description
  return variantsOf(entity).find((v) => v.name === name)?.text ?? description
}

/** The text a job prints for an entry: its own text for this job, else the chosen version, else the main description. */
export function printedDescription(entity: EntityMeta, config: { entity_description_overrides?: Record<string, string>; description_variant?: Record<string, string> }): string {
  return config.entity_description_overrides?.[entity.id] ?? versionText(entity, config.description_variant?.[entity.id])
}

// The form keeps the versions as one string (the autosave of the editor saves strings, one per field).

export function serializeVariants(variants: DescriptionVariant[]): string {
  return JSON.stringify(variants)
}

export function parseVariants(value: string): DescriptionVariant[] {
  try {
    const parsed: unknown = JSON.parse(value)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((v): v is DescriptionVariant => !!v && typeof v === 'object' && typeof (v as DescriptionVariant).name === 'string' && typeof (v as DescriptionVariant).text === 'string')
      .map((v) => ({ name: v.name, text: v.text }))
  } catch {
    return []
  }
}

/** What is wrong with the versions, if anything: it must not be saved until it is fixed. */
export function variantsError(variants: DescriptionVariant[], descriptionLimit: number): string | undefined {
  if (variants.length > LIMITS.descriptionVariants.perEntry) return `At most ${LIMITS.descriptionVariants.perEntry} other versions.`
  const seen = new Set<string>()
  for (const [i, v] of variants.entries()) {
    const name = v.name.trim()
    if (name === '') return `Give version ${i + 1} a name.`
    if (name.length > LIMITS.descriptionVariants.name) return `A name is at most ${LIMITS.descriptionVariants.name} characters.`
    if (seen.has(name.toLowerCase())) return `Two versions are named "${name}".`
    seen.add(name.toLowerCase())
    if ([...v.text].length > descriptionLimit) return `"${name}" is over ${descriptionLimit.toLocaleString('en-US')} characters.`
  }
  return undefined
}

/** A name for a new version that no other version has: "Version 2", "Version 3"... */
export function nextVersionName(variants: DescriptionVariant[]): string {
  const taken = new Set(variants.map((v) => v.name.trim().toLowerCase()))
  for (let n = variants.length + 2; ; n++) if (!taken.has(`version ${n}`)) return `Version ${n}`
}

/** The version at `index` becomes the main description and the main one takes its place, with the version's name. */
export function makeMain(description: string, variants: DescriptionVariant[], index: number): { description: string; variants: DescriptionVariant[] } {
  const chosen = variants[index]
  if (!chosen) return { description, variants }
  return { description: chosen.text, variants: variants.map((v, i) => (i === index ? { name: v.name, text: description } : v)) }
}
