import type { EntityMeta, ExperienceMeta, ProjectMeta, SkillMeta } from '@/types'
import type { AIAnalysisResult, EntityRankingResult } from '@/types/job'
import { LIMITS } from '@/config/limits'
import { RANKING_LIMITS, RECOMMEND_FROM_LEVEL } from '@/config/ranking'
import { stringify } from 'yaml'
import { ANSWER_LAYOUT, exampleWithHeader, type PromptOptions } from './formats'
import { checkProposal, type Header } from './header'
import { cleanOffer } from './offer'

/**
 * The prompt and the output contract of the job-ranking AI call.
 *
 * The AI answers about labels (E1, P3, S2), never about real ids, and rates
 * every entry; the code validates the answer, drops what it cannot trust and
 * chooses what is recommended (#184).
 */

export const RANKING_SYSTEM_PROMPT = ANSWER_LAYOUT.json.system

export type RankedType = 'experiences' | 'projects' | 'skills'

const PREFIX: Record<RankedType, string> = { experiences: 'E', projects: 'P', skills: 'S' }

/** label ("E1") -> the entry it stands for */
export type RankingLabels = Map<string, { type: RankedType; entity: EntityMeta }>

/** What a prompt is made of, for a size check: the characters of each part and of each entry's line. */
export interface PromptMeasure {
  prompt: string
  labels: RankingLabels
  parts: Record<string, string>
  /** label ("P3") -> characters of the entry's line in the prompt */
  sizes: Record<string, number>
}

export function buildRankingPrompt(
  jobTitle: string,
  jobCompany: string,
  jobDescription: string,
  entities: { experiences: EntityMeta[]; projects: EntityMeta[]; skills: EntityMeta[] },
  options: PromptOptions = {},
  /** The title and the profile of the candidate, already made safe (`headerForPrompt`); asked to be adapted to the offer (#294). */
  header?: Header,
): PromptMeasure {
  const labels: RankingLabels = new Map()
  const sizes: Record<string, number> = {}
  const yamlLibrary = options.libraryFormat === 'yaml'
  const lines = (type: RankedType, text: (e: EntityMeta) => string, fields: (e: EntityMeta) => object) => {
    const labelled = entities[type].map((entity, i) => {
      const label = `${PREFIX[type]}${i + 1}`
      labels.set(label, { type, entity })
      return [label, entity] as const
    })
    if (labelled.length === 0) return '(none)'
    for (const [label, e] of labelled) sizes[label] = [...text(e)].length
    return yamlLibrary
      ? stringify(Object.fromEntries(labelled.map(([label, e]) => [label, fields(e)])), { lineWidth: 0 }).trimEnd()
      : labelled.map(([label, e]) => `${label}. ${text(e)}`).join('\n')
  }

  const experiences = lines('experiences', (e) => {
    const x = e as ExperienceMeta
    return `${x.title} at ${x.company} (${x.period}): ${x.description}`
  }, (e) => {
    const x = e as ExperienceMeta
    return { title: x.title, company: x.company, period: x.period, description: x.description }
  })
  const projects = lines('projects', (e) => {
    const x = e as ProjectMeta
    return `${x.title} [${x.tech?.join(', ')}]: ${x.description}`
  }, (e) => {
    const x = e as ProjectMeta
    return { title: x.title, tech: x.tech ?? [], description: x.description }
  })
  const skills = lines('skills', (e) => {
    const x = e as SkillMeta
    return `${x.name}, ${x.level}. Tags: ${(x.tags ?? []).map((tag, i) => `${i + 1} ${tag}`).join(', ')}`
  }, (e) => {
    const x = e as SkillMeta
    return { name: x.name, level: x.level, tags: x.tags ?? [] }
  })

  // The prompt is built from named parts so the evaluation can tell what each one costs. The parts that
  // stay the same come first (the instructions, then the user's library) and the offer last: a model
  // provider that caches the start of a prompt can then reuse it from one offer to the next.
  const layout = ANSWER_LAYOUT[options.answerFormat ?? 'json']
  const withHeader = !!header && (header.title !== '' || header.profile !== '')
  const parts: Record<string, string> = {
    intro: `You are a strict technical recruiter. Rate how well each entry of a candidate's library fits a job offer. Below: how to answer, then the library, then the job offer.`,
    answer: `ANSWER
${layout.instruction}
${withHeader ? exampleWithHeader(options.answerFormat ?? 'json') : layout.example}

RULES
- "levels" has EVERY label of the library, each with a level, using the label exactly as given. Never skip one, never invent one.
- Level: 3 = the offer asks for it (same technology or same kind of work); 2 = related and transferable; 1 = weak link; 0 = unrelated. Be strict: level 3 needs the offer's technology or domain to appear in the entry itself.
- "best": for each type, the entries of level 2 or 3, best first: at most ${RANKING_LIMITS.experiences.max} experiences, ${RANKING_LIMITS.projects.max} projects, ${RANKING_LIMITS.skills.max} skills. For experiences and projects, "why" names the evidence in the entry. For skills, "tags" are the numbers of the tags of that skill that matter for this offer.
- "ats_tags": 5 to 10 keywords an applicant tracking system would search in this offer (tools, languages, domain, level, work mode).
- "new_skill_tags": 0 to 5 technologies or skills the offer asks for that no skill of the library has; each one is a tag to add to the skill it fits best ("skill" is its label).${withHeader ? `
- "title": the candidate's resume title for this offer, one line of at most ${LIMITS.profile.resume_title} characters. Keep the candidate's own title unless the offer's role or field calls for another; only reword it, never promote it.
- "profile": the candidate's profile paragraph for this offer. Change ONLY what is tied to the offer (the target role, the field, the technologies the offer names) and keep the rest word for word: a sentence about languages, studies or interests is not touched. Never add a skill, a degree, a company or a number that is not in the paragraph or in the library. Placeholders such as [name] or [email] stand for details taken out: never change, repeat or invent one. If nothing needs changing, return the paragraph as it is.` : ''}`,
    experiences: `CANDIDATE LIBRARY (every entry has a label)
EXPERIENCES
${experiences}`,
    projects: `PROJECTS
${projects}`,
    skills: `SKILLS${yamlLibrary ? ' (the tags of a skill are numbered from 1 in the order listed)' : ''}
${skills}`,
    ...(withHeader ? { header: `CANDIDATE HEADER (what the resume says first)
Title: ${header.title || '(none)'}
Profile:
${header.profile || '(none)'}` } : {}),
    offer: `JOB OFFER
Title: ${jobTitle}
Company: ${jobCompany}
Description:
${options.cleanOffer === 'code' ? cleanOffer(jobDescription) : jobDescription}`,
  }
  const prompt = Object.values(parts).join('\n\n')

  return { prompt, labels, parts, sizes }
}

type Schema = Record<string, unknown>

const string: Schema = { type: 'string' }

/**
 * The JSON Schema the AI's answer must follow. It lists the exact labels of this
 * library: `levels` must give every label a level from 0 to 3, and `best` can
 * only name labels of the right type, so the AI cannot invent a label, skip an
 * entry or use another level.
 *
 * It stays simple on purpose: a first version also forced the exact number of
 * entries and the length of every text, and the model server then took minutes
 * to build its grammar (8 of 15 evaluation calls failed).
 */
export function buildRankingSchema(labels: RankingLabels, withHeader = false): Schema {
  const labelsOf = (type: RankedType) => [...labels].filter(([, l]) => l.type === type).map(([label]) => label)

  const best = (type: RankedType, properties: Schema): Schema => {
    const ids = labelsOf(type)
    if (ids.length === 0) return { type: 'array', maxItems: 0 }
    return {
      type: 'array',
      items: {
        type: 'object',
        properties: { id: { enum: ids }, ...properties },
        required: ['id'],
        additionalProperties: false,
      },
    }
  }

  const every = [...labels.keys()]
  const skillLabels = labelsOf('skills')
  return {
    type: 'object',
    properties: {
      ats_tags: { type: 'array', items: string },
      levels: {
        type: 'object',
        properties: Object.fromEntries(every.map((label) => [label, { enum: [0, 1, 2, 3] }])),
        required: every,
        additionalProperties: false,
      },
      best: {
        type: 'object',
        properties: {
          experiences: best('experiences', { why: string }),
          projects: best('projects', { why: string }),
          skills: best('skills', { tags: { type: 'array', items: { type: 'integer' } } }),
        },
        required: ['experiences', 'projects', 'skills'],
        additionalProperties: false,
      },
      ...(withHeader ? { title: string, profile: string } : {}),
      new_skill_tags: skillLabels.length === 0
        ? { type: 'array', maxItems: 0 }
        : {
            type: 'array',
            items: {
              type: 'object',
              properties: { skill: { enum: skillLabels }, tag: string },
              required: ['skill', 'tag'],
              additionalProperties: false,
            },
          },
    },
    required: ['ats_tags', 'levels', 'best', 'new_skill_tags', ...(withHeader ? ['title', 'profile'] : [])],
    additionalProperties: false,
  }
}

export interface RankingDiagnostics {
  /** Labels the AI used that do not exist, or of another type, or with no valid level: dropped. */
  invalidIds: number
  /** Entries the AI did not rate at all. */
  unrated: number
  /** The types the AI left with nothing recommended although the library has entries of them: the code completed them (#218). */
  emptyTypes: RankedType[]
  /** The texts of the header the AI proposed and the code refused: a detail of the person, a text too long (#294). */
  droppedProposals: ('title' | 'profile')[]
}

type Analysis = Omit<AIAnalysisResult, 'job_id' | 'analyzed_at'>
interface Rated {
  entity: EntityMeta
  level: 0 | 1 | 2 | 3
  why: string
  tags: string[]
}

const isRecord = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x)
const text = (x: unknown, max: number) => (typeof x === 'string' ? x.trim().slice(0, max) : '')
const textList = (x: unknown, max: number) =>
  Array.isArray(x) ? [...new Set(x.filter((t): t is string => typeof t === 'string').map((t) => t.trim()).filter(Boolean))].slice(0, max) : []

const NAME_OF: Record<RankedType, (e: EntityMeta) => string> = {
  experiences: (e) => (e as ExperienceMeta).title,
  projects: (e) => (e as ProjectMeta).title,
  skills: (e) => (e as SkillMeta).name,
}
const ENTRY_TYPE = { experiences: 'experience', projects: 'project', skills: 'skill' } as const

/** The tags of a skill the AI picked by number (1 is the first); a tag written out is accepted too. Only tags of the skill are kept. */
function tagsOf(raw: unknown, own: string[]): string[] {
  const byLower = new Map(own.map((t) => [t.toLowerCase(), t]))
  const kept = new Set<string>()
  for (const item of Array.isArray(raw) ? raw : []) {
    const n = typeof item === 'number' ? item : typeof item === 'string' && /^\d+$/.test(item.trim()) ? Number(item) : NaN
    const tag = Number.isInteger(n) ? own[n - 1] : typeof item === 'string' ? byLower.get(item.trim().toLowerCase()) : undefined
    if (tag) kept.add(tag)
  }
  return [...kept]
}

/** The label the AI wrote, normalised ("e1" -> "E1"). */
const labelOf = (x: unknown) => (typeof x === 'string' ? x.trim().toUpperCase() : '')

/** The level the AI gave to every label, validated: unknown labels and levels outside 0 to 3 are dropped and counted. */
function readLevels(raw: unknown, labels: RankingLabels, diagnostics: RankingDiagnostics): Map<string, Rated['level']> {
  const levels = new Map<string, Rated['level']>()
  for (const [key, value] of Object.entries(isRecord(raw) ? raw : {})) {
    const label = labelOf(key)
    const level = Number(value)
    if (!labels.has(label) || ![0, 1, 2, 3].includes(level) || value === null || value === '') {
      diagnostics.invalidIds++
    } else if (!levels.has(label)) {
      levels.set(label, level as Rated['level'])
    }
  }
  return levels
}

/** One type, validated: its rated entries, ordered by level then by the AI's "best" list. */
function rate(type: RankedType, root: Record<string, unknown>, levels: Map<string, Rated['level']>, labels: RankingLabels, diagnostics: RankingDiagnostics): Rated[] {
  const best = isRecord(root.best) && Array.isArray(root.best[type]) ? (root.best[type] as unknown[]) : []
  const picked = new Map<string, { position: number; why: string; tags: string[] }>()
  for (const item of best) {
    const label = labelOf(isRecord(item) ? item.id : item)
    const known = labels.get(label)
    if (!known || known.type !== type) {
      diagnostics.invalidIds++
    } else if (!picked.has(label)) {
      const record = isRecord(item) ? item : {}
      picked.set(label, {
        position: picked.size,
        why: text(record.why, 200),
        tags: type === 'skills' ? tagsOf(record.tags, (known.entity as SkillMeta).tags ?? []) : [],
      })
    }
  }

  const rated: (Rated & { position: number })[] = []
  for (const [label, { entity }] of labels) {
    const level = levels.get(label)
    if (labels.get(label)?.type !== type) continue
    if (level === undefined) {
      diagnostics.unrated++
      continue
    }
    const best = picked.get(label)
    rated.push({ entity, level, why: best?.why ?? '', tags: best?.tags ?? [], position: best?.position ?? Infinity })
  }
  // Level first, then the AI's own order among its best, then the order of the library.
  return rated.sort((a, b) => b.level - a.level || a.position - b.position)
}

/**
 * What is recommended: the good ones up to the maximum, topped up with weak ones to reach the minimum. A type is never
 * left empty when the library has entries of it (#218): the model sometimes rates a whole type 0, and a resume with no
 * experience or no project selected would come out without any message. The entries then come in the order the model
 * gave (its "best" list, then the library's), and `filled` says the type had to be completed.
 */
function choose(rated: Rated[], all: Rated[], { min, max }: { min: number; max: number }): { chosen: Rated[]; filled: boolean } {
  const good = rated.filter((r) => r.level >= RECOMMEND_FROM_LEVEL).slice(0, max)
  if (good.length >= min) return { chosen: good, filled: false }
  const weak = rated.filter((r) => r.level >= 1).slice(0, min)
  if (weak.length > 0) return { chosen: weak, filled: false }
  const chosen = (rated.length > 0 ? rated : all).slice(0, min)
  return { chosen, filled: chosen.length > 0 }
}

/**
 * Turns the JSON document the AI returned into the shared analysis shape (minus
 * job_id/analyzed_at, set by the caller). The answer is untrusted input: every
 * label is checked against the library.
 */
export function normalizeRanking(
  data: unknown,
  labels: RankingLabels,
  /** What the user wrote as title and profile, and the text the AI wrote from (the proposal is checked against both). */
  header?: { original: Header; known: string },
): { analysis: Analysis; diagnostics: RankingDiagnostics } {
  if (!isRecord(data)) throw new Error('The AI answer is not a JSON object.')
  const diagnostics: RankingDiagnostics = { invalidIds: 0, unrated: 0, emptyTypes: [], droppedProposals: [] }

  const levels = readLevels(data.levels, labels, diagnostics)
  const rated = {
    experiences: rate('experiences', data, levels, labels, diagnostics),
    projects: rate('projects', data, levels, labels, diagnostics),
    skills: rate('skills', data, levels, labels, diagnostics),
  }
  // The entries of a type the model did not rate at all, in the order of the library (the last resort of `choose`).
  const unrated = (type: RankedType): Rated[] =>
    [...labels.values()].filter((l) => l.type === type).map((l) => ({ entity: l.entity, level: 0 as const, why: '', tags: [] }))
  const chosen = {} as Record<RankedType, Rated[]>
  for (const type of ['experiences', 'projects', 'skills'] as const) {
    const { chosen: picked, filled } = choose(rated[type], unrated(type), RANKING_LIMITS[type])
    chosen[type] = picked
    if (filled) diagnostics.emptyTypes.push(type)
  }

  const entry = (type: RankedType, r: Rated, i: number): EntityRankingResult => ({
    id: r.entity.id,
    type: ENTRY_TYPE[type],
    name: NAME_OF[type](r.entity),
    level: r.level,
    rank: i + 1,
    reason: r.why,
  })

  // Only the tags the AI kept, narrower than the whole list.
  const skillTags: Record<string, string[]> = {}
  for (const r of chosen.skills) {
    const total = (r.entity as SkillMeta).tags?.length ?? 0
    if (r.tags.length > 0 && r.tags.length < total) skillTags[r.entity.id] = r.tags
  }

  const newSkillTags = (Array.isArray(data.new_skill_tags) ? data.new_skill_tags : [])
    .filter(isRecord)
    .flatMap((t) => {
      const target = labels.get(labelOf(t.skill))
      const tag = text(t.tag, 80)
      if (!target || target.type !== 'skills' || !tag) return []
      if (((target.entity as SkillMeta).tags ?? []).some((own) => own.toLowerCase() === tag.toLowerCase())) return []
      return [{ skill_id: target.entity.id, tag, reason: '' }]
    })
    .slice(0, 5)

  // The title and the profile proposed for this offer, checked in code (#294): nothing of the person, nothing too long.
  const proposal = header ? checkProposal(data, header.original, header.known) : undefined
  if (proposal) diagnostics.droppedProposals = proposal.dropped

  return {
    analysis: {
      ...(proposal?.title !== undefined ? { recommended_title: proposal.title, title_new_terms: proposal.titleNewTerms } : {}),
      ...(proposal?.profile !== undefined ? { recommended_profile: proposal.profile, profile_new_terms: proposal.profileNewTerms } : {}),
      ats_tags: textList(data.ats_tags, 10),
      entities_by_type: {
        experiences: rated.experiences.map((r, i) => entry('experiences', r, i)),
        projects: rated.projects.map((r, i) => entry('projects', r, i)),
        skills: rated.skills.map((r, i) => entry('skills', r, i)),
        education: [],
      },
      recommended_experience_ids: chosen.experiences.map((r) => r.entity.id),
      recommended_project_ids: chosen.projects.map((r) => r.entity.id),
      recommended_skill_ids: chosen.skills.map((r) => r.entity.id),
      recommended_skill_tags: skillTags,
      suggested_new_skills: [],
      suggested_new_skill_tags: newSkillTags,
    },
    diagnostics,
  }
}
