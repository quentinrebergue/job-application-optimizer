import type { EntityMeta, ExperienceMeta, ProjectMeta, SkillMeta } from '@/types'
import type { AIAnalysisResult, EntityRankingResult } from '@/types/job'
import { RANKING_LIMITS, RECOMMEND_FROM_LEVEL } from '@/config/ranking'

/**
 * The prompt and the output contract of the job-ranking AI call.
 *
 * The AI answers about labels (E1, P3, S2), never about real ids, and rates
 * every entry; the code validates the answer, drops what it cannot trust and
 * chooses what is recommended (#184).
 */

export const RANKING_SYSTEM_PROMPT = 'You answer with a single valid JSON object and nothing else.'

export type RankedType = 'experiences' | 'projects' | 'skills'

const PREFIX: Record<RankedType, string> = { experiences: 'E', projects: 'P', skills: 'S' }

/** label ("E1") -> the entry it stands for */
export type RankingLabels = Map<string, { type: RankedType; entity: EntityMeta }>

export function buildRankingPrompt(
  jobTitle: string,
  jobCompany: string,
  jobDescription: string,
  entities: { experiences: EntityMeta[]; projects: EntityMeta[]; skills: EntityMeta[] },
): { prompt: string; labels: RankingLabels } {
  const labels: RankingLabels = new Map()
  const lines = (type: RankedType, text: (e: EntityMeta) => string) =>
    entities[type]
      .map((entity, i) => {
        const label = `${PREFIX[type]}${i + 1}`
        labels.set(label, { type, entity })
        return `${label}. ${text(entity)}`
      })
      .join('\n') || '(none)'

  const experiences = lines('experiences', (e) => {
    const x = e as ExperienceMeta
    return `${x.title} at ${x.company} (${x.period}): ${x.description}`
  })
  const projects = lines('projects', (e) => {
    const x = e as ProjectMeta
    return `${x.title} [${x.tech?.join(', ')}]: ${x.description}`
  })
  const skills = lines('skills', (e) => {
    const x = e as SkillMeta
    return `${x.name}, ${x.level} (tags: ${x.tags?.join(', ')})`
  })

  const prompt = `You are a strict technical recruiter. Rate how well each entry of a candidate's library fits a job offer.

JOB OFFER
Title: ${jobTitle}
Company: ${jobCompany}
Description:
${jobDescription}

CANDIDATE LIBRARY (every entry has a label)
EXPERIENCES
${experiences}

PROJECTS
${projects}

SKILLS
${skills}

ANSWER
One JSON object, nothing else:
{
  "ats_tags": ["keyword"],
  "experiences": [{"id": "E2", "level": 3, "why": "at most 10 words"}],
  "projects": [{"id": "P1", "level": 2, "why": "at most 10 words"}],
  "skills": [{"id": "S1", "level": 3, "why": "at most 10 words", "tags": ["tag"]}],
  "new_skills": [{"name": "Rust", "category": "Languages", "level": "intermediate", "tags": ["tag"], "reason": "at most 10 words"}],
  "new_skill_tags": [{"skill": "S1", "tag": "new tag", "reason": "at most 10 words"}]
}

RULES
- Rate EVERY entry of "experiences", "projects" and "skills", using its label exactly as given. Never skip one, never invent one.
- Level: 3 = the offer asks for it (same technology or same kind of work); 2 = related and transferable; 1 = weak link; 0 = unrelated. Be strict: level 3 needs the offer's technology or domain to appear in the entry itself.
- List each array best first (level 3 first).
- "why": at most 10 words, naming the evidence in the entry. Only for levels 2 and 3; leave it out for levels 0 and 1.
- Skills: "tags" lists only the tags of that skill that matter for this offer, copied exactly; only for levels 2 and 3.
- "ats_tags": 5 to 10 keywords an applicant tracking system would search in this offer (tools, languages, domain, level, work mode).
- "new_skills": 0 to 3 skills the offer asks for that the library lacks. "new_skill_tags": 0 to 5 tags to add to an existing skill ("skill" is its label).`

  return { prompt, labels }
}

export interface RankingDiagnostics {
  /** Labels the AI used that do not exist, or of another type, or with no valid level: dropped. */
  invalidIds: number
  /** Entries the AI did not rate at all. */
  unrated: number
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
const SKILL_LEVELS = ['beginner', 'intermediate', 'advanced', 'expert']

/** The AI's list for one type, validated: unknown or misplaced labels and bad levels dropped, best level first. */
function rate(raw: unknown, type: RankedType, labels: RankingLabels, diagnostics: RankingDiagnostics): Rated[] {
  const seen = new Set<string>()
  const rated: Rated[] = []
  for (const item of Array.isArray(raw) ? raw : []) {
    const label = isRecord(item) && typeof item.id === 'string' ? item.id.trim().toUpperCase() : ''
    const known = labels.get(label)
    const level = isRecord(item) ? Number(item.level) : NaN
    if (!known || known.type !== type || ![0, 1, 2, 3].includes(level)) {
      diagnostics.invalidIds++
      continue
    }
    if (seen.has(label)) continue
    seen.add(label)
    const record = item as Record<string, unknown>
    rated.push({
      entity: known.entity,
      level: level as Rated['level'],
      why: text(record.why, 200),
      tags: textList(record.tags, 60),
    })
  }
  diagnostics.unrated += [...labels.values()].filter((l) => l.type === type).length - rated.length
  return rated.sort((a, b) => b.level - a.level) // stable: the AI's order within a level
}

/** What is recommended: the good ones up to the maximum, topped up with weak ones to reach the minimum. */
function choose(rated: Rated[], { min, max }: { min: number; max: number }): Rated[] {
  const good = rated.filter((r) => r.level >= RECOMMEND_FROM_LEVEL).slice(0, max)
  return good.length >= min ? good : rated.filter((r) => r.level >= 1).slice(0, min)
}

/**
 * Turns the JSON document the AI returned into the shared analysis shape (minus
 * job_id/analyzed_at, set by the caller). The answer is untrusted input: every
 * label is checked against the library.
 */
export function normalizeRanking(data: unknown, labels: RankingLabels): { analysis: Analysis; diagnostics: RankingDiagnostics } {
  if (!isRecord(data)) throw new Error('The AI answer is not a JSON object.')
  const diagnostics: RankingDiagnostics = { invalidIds: 0, unrated: 0 }

  const rated = {
    experiences: rate(data.experiences, 'experiences', labels, diagnostics),
    projects: rate(data.projects, 'projects', labels, diagnostics),
    skills: rate(data.skills, 'skills', labels, diagnostics),
  }
  const chosen = {
    experiences: choose(rated.experiences, RANKING_LIMITS.experiences),
    projects: choose(rated.projects, RANKING_LIMITS.projects),
    skills: choose(rated.skills, RANKING_LIMITS.skills),
  }

  const entry = (type: RankedType, r: Rated, i: number): EntityRankingResult => ({
    id: r.entity.id,
    type: ENTRY_TYPE[type],
    name: NAME_OF[type](r.entity),
    level: r.level,
    rank: i + 1,
    reason: r.why,
  })

  // Only the tags the AI kept that really belong to the skill, narrower than the whole list.
  const skillTags: Record<string, string[]> = {}
  for (const r of chosen.skills) {
    const own = (r.entity as SkillMeta).tags ?? []
    const byLower = new Map(own.map((t) => [t.toLowerCase(), t]))
    const kept = [...new Set(r.tags.map((t) => byLower.get(t.toLowerCase())).filter((t): t is string => !!t))]
    if (kept.length > 0 && kept.length < own.length) skillTags[r.entity.id] = kept
  }

  const existingNames = new Set(rated.skills.map((r) => NAME_OF.skills(r.entity).toLowerCase()))
  const newSkills = (Array.isArray(data.new_skills) ? data.new_skills : [])
    .filter(isRecord)
    .map((s) => ({
      name: text(s.name, 80),
      category: text(s.category, 80),
      level: SKILL_LEVELS.includes(String(s.level)) ? String(s.level) : 'intermediate',
      tags: textList(s.tags, 10),
      reason: text(s.reason, 200),
    }))
    .filter((s) => s.name && s.category && !existingNames.has(s.name.toLowerCase()))
    .slice(0, 3)

  const newSkillTags = (Array.isArray(data.new_skill_tags) ? data.new_skill_tags : [])
    .filter(isRecord)
    .flatMap((t) => {
      const target = labels.get(typeof t.skill === 'string' ? t.skill.trim().toUpperCase() : '')
      const tag = text(t.tag, 80)
      if (!target || target.type !== 'skills' || !tag) return []
      if (((target.entity as SkillMeta).tags ?? []).some((own) => own.toLowerCase() === tag.toLowerCase())) return []
      return [{ skill_id: target.entity.id, tag, reason: text(t.reason, 200) }]
    })
    .slice(0, 5)

  return {
    analysis: {
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
      suggested_new_skills: newSkills,
      suggested_new_skill_tags: newSkillTags,
    },
    diagnostics,
  }
}
