// Pure functions behind the "Resume for this job" panel: no React, no fetch, so
// they can be tested on their own. Each update returns a new ResumeConfig.

import type { EntityMeta, ResumeConfig, SkillMeta } from '@/types'
import type { AIAnalysisResult, EntityRankingResult } from '@/types/job'

export const TYPE_ORDER = ['experiences', 'projects', 'skills', 'education'] as const
export type EntityType = (typeof TYPE_ORDER)[number]

export const TYPE_LABELS: Record<EntityType, string> = {
  experiences: 'Work experience',
  projects: 'Projects',
  skills: 'Technical expertise',
  education: 'Education',
}

export const EMPTY_CONFIG: ResumeConfig = {
  selected_entity_ids: [],
  ai_rankings: [],
  profile_text: '',
  resume_title: '',
  ai_context: '',
  skill_tag_overrides: {},
}

export function entityLabel(e: EntityMeta): string {
  if (e.type === 'skills') return e.name
  if (e.type === 'education') return e.degree
  return e.title
}

/** Second line of an entry: where and when (nothing for a skill: its level is not useful here). */
export function entitySubLabel(e: EntityMeta): string {
  const parts = e.type === 'experiences' ? [e.company, e.period]
    : e.type === 'projects' ? [e.tech.slice(0, 3).join(', ')]
    : e.type === 'education' ? [e.institution, e.period]
    : []
  return parts.filter(Boolean).join(' · ')
}

// ─── Dates ───────────────────────────────────────────────────────────────────

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']

/**
 * End date of a period such as "02/2026 – 08/2026", "June 2024 – August 2024",
 * "2020 – 2026" or "2024 – Present". "Present" sorts after everything.
 */
export function parseEndDate(period: string): Date {
  const parts = period.split(/–|—/).map((p) => p.trim())
  const end = parts[parts.length - 1] ?? ''
  if (end.toLowerCase().includes('present')) return new Date(9999, 11, 31)

  const mmyyyy = end.match(/(\d{1,2})\/(\d{4})/)
  if (mmyyyy) return new Date(parseInt(mmyyyy[2]), parseInt(mmyyyy[1]) - 1, 1)

  let year = 2000
  let month = 0
  for (const word of end.split(/\s+/)) {
    const y = word.match(/\d{4}/)
    if (y) year = parseInt(y[0])
    const m = MONTHS.findIndex((name) => name === word.toLowerCase() || name.slice(0, 3) === word.toLowerCase())
    if (m !== -1) month = m
  }
  return new Date(year, month, 1)
}

const period = (e: EntityMeta) => (e as { period?: string }).period ?? ''
const mostRecentFirst = (a: EntityMeta, b: EntityMeta) => parseEndDate(period(b)).getTime() - parseEndDate(period(a)).getTime()

// ─── Scores and grouping ─────────────────────────────────────────────────────

/** What sorts an entry: its level, then its place in the AI's list; the score of rankings saved before the levels. */
function aiPriority(r: EntityRankingResult): number {
  return r.level !== undefined ? r.level * 1000 - (r.rank ?? 0) : (r.score ?? -1)
}

/** The AI's priority for a project (0–1 saved rankings, or the live analysis), -1 when unknown. */
function projectScore(id: string, config: ResumeConfig, ai?: AIAnalysisResult | null): number {
  const live = ai?.entities_by_type.projects.find((p) => p.id === id)
  return live ? aiPriority(live) : config.ai_rankings.find((r) => r.entity_id === id)?.score ?? -1
}

function rankingScore(id: string, config: ResumeConfig): number {
  return config.ai_rankings.find((r) => r.entity_id === id)?.score ?? -1
}

/** Items in the custom order first, in that order; the others after, sorted by `fallback`. */
function byCustomOrder(order: string[] | undefined, fallback: (a: EntityMeta, b: EntityMeta) => number) {
  if (!order || order.length === 0) return fallback
  const index = new Map(order.map((id, i) => [id, i]))
  return (a: EntityMeta, b: EntityMeta) => {
    const ia = index.get(a.id)
    const ib = index.get(b.id)
    if (ia !== undefined && ib !== undefined) return ia - ib
    if (ia !== undefined) return -1
    if (ib !== undefined) return 1
    return fallback(a, b)
  }
}

/** Entities grouped by type, each group in display order. */
export function groupEntities(entities: EntityMeta[], config: ResumeConfig, ai?: AIAnalysisResult | null): Record<EntityType, EntityMeta[]> {
  const byProjectScore = (a: EntityMeta, b: EntityMeta) => projectScore(b.id, config, ai) - projectScore(a.id, config, ai)
  const byRanking = (a: EntityMeta, b: EntityMeta) => rankingScore(b.id, config) - rankingScore(a.id, config)
  const sorts: Record<EntityType, ((a: EntityMeta, b: EntityMeta) => number) | null> = {
    education: mostRecentFirst,
    experiences: byCustomOrder(config.experience_order, mostRecentFirst),
    projects: byCustomOrder(config.project_order, byProjectScore),
    skills: config.ai_rankings.length > 0 ? byRanking : null,
  }
  const groups = {} as Record<EntityType, EntityMeta[]>
  for (const type of TYPE_ORDER) {
    const group = entities.filter((e) => e.type === type)
    const sort = sorts[type]
    groups[type] = sort ? group.sort(sort) : group
  }
  return groups
}

// ─── Updates ─────────────────────────────────────────────────────────────────

const ORDER_KEY = { experiences: 'experience_order', projects: 'project_order' } as const

/**
 * Selects or unselects an entity. An unselected experience or project keeps its
 * place in the order, so it does not jump in the list (the PDF only prints the
 * selected ones); a newly selected one not yet in the order goes last.
 */
export function toggleEntity(config: ResumeConfig, entity: EntityMeta): ResumeConfig {
  const selected = config.selected_entity_ids.includes(entity.id)
  const next: ResumeConfig = {
    ...config,
    selected_entity_ids: selected
      ? config.selected_entity_ids.filter((id) => id !== entity.id)
      : [...config.selected_entity_ids, entity.id],
  }
  if (!selected && (entity.type === 'experiences' || entity.type === 'projects')) {
    const key = ORDER_KEY[entity.type]
    const order = config[key] ?? []
    if (!order.includes(entity.id)) next[key] = [...order, entity.id]
  }
  return next
}

/**
 * Moves a selected experience or project one step up or down among the selected
 * ones: it swaps places with the previous or next selected entry of the order.
 */
export function moveEntity(config: ResumeConfig, type: 'experiences' | 'projects', id: string, direction: 'up' | 'down'): ResumeConfig {
  const key = ORDER_KEY[type]
  const order = config[key] ?? []
  const index = order.indexOf(id)
  if (index === -1) return config
  const isSelected = (other: string) => config.selected_entity_ids.includes(other)
  let target = index
  do target += direction === 'up' ? -1 : 1
  while (target >= 0 && target < order.length && !isSelected(order[target]))
  if (target < 0 || target >= order.length) return config
  const next = [...order]
  ;[next[index], next[target]] = [next[target], next[index]]
  return { ...config, [key]: next }
}

/** Orders the selected experiences or projects by AI score, highest first. */
export function applyAiOrder(config: ResumeConfig, entities: EntityMeta[], type: 'experiences' | 'projects'): ResumeConfig {
  const sorted = entities
    .filter((e) => e.type === type && config.selected_entity_ids.includes(e.id))
    .map((e) => ({ id: e.id, score: config.ai_rankings.find((r) => r.entity_id === e.id)?.score ?? 0 }))
    .sort((a, b) => b.score - a.score)
    .map((e) => e.id)
  return { ...config, [ORDER_KEY[type]]: sorted }
}

/** Includes or excludes one tag of a skill; no override is kept when all base tags are selected. */
export function toggleSkillTag(config: ResumeConfig, skillId: string, tag: string, baseTags: string[]): ResumeConfig {
  const current = config.skill_tag_overrides?.[skillId] ?? baseTags
  const next = current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag]
  const overrides = { ...(config.skill_tag_overrides ?? {}) }
  if ([...next].sort().join('|') === [...baseTags].sort().join('|')) delete overrides[skillId]
  else overrides[skillId] = next
  return { ...config, skill_tag_overrides: overrides }
}

/** Shows or hides the technologies printed under the projects of this resume; showing is the default, so no key is kept for it. */
export function toggleProjectTech(config: ResumeConfig): ResumeConfig {
  if (config.show_project_tech === false) {
    const shown = { ...config }
    delete shown.show_project_tech
    return shown
  }
  return { ...config, show_project_tech: false }
}

/** Sets a custom description; an empty or unchanged one removes the override. */
export function setDescription(config: ResumeConfig, entityId: string, value: string, original: string): ResumeConfig {
  const overrides = { ...(config.entity_description_overrides ?? {}) }
  if (value === original || value.trim() === '') delete overrides[entityId]
  else overrides[entityId] = value
  return { ...config, entity_description_overrides: overrides }
}

/**
 * Chooses which version of the description a job prints for an entry; the main description (null) removes the choice.
 * The text written for this job is dropped too: it would hide the version just chosen, and the text now starts from it.
 */
export function setDescriptionVariant(config: ResumeConfig, entityId: string, name: string | null): ResumeConfig {
  const chosen = { ...(config.description_variant ?? {}) }
  if (name === null) delete chosen[entityId]
  else chosen[entityId] = name
  const overrides = { ...(config.entity_description_overrides ?? {}) }
  delete overrides[entityId]
  return { ...config, description_variant: chosen, entity_description_overrides: overrides }
}

/** Default selection: every education entry. */
export function resetConfig(entities: EntityMeta[]): ResumeConfig {
  return {
    ...EMPTY_CONFIG,
    selected_entity_ids: entities.filter((e) => e.type === 'education').map((e) => e.id),
    entity_description_overrides: {},
  }
}

/**
 * The config to show when the panel opens: the saved one, plus education when
 * nothing is selected yet, plus what the AI recommends, plus orders initialised
 * from the selection. Shown only; saved on the user's next change.
 *
 * The recommendations of an analysis are applied **once**: `ai_applied_at` names the analysis whose
 * recommendations the selection already holds, so entries the user unticked after the ranking are not ticked again
 * on the next visit. A new analysis ("Rank again") has another date and is applied.
 */
export function initialConfig(saved: ResumeConfig | null, entities: EntityMeta[], ai?: AIAnalysisResult | null): ResumeConfig {
  let cfg: ResumeConfig = saved?.selected_entity_ids ? saved : EMPTY_CONFIG
  const add = (ids: string[] | undefined) => {
    if (ids?.length) cfg = { ...cfg, selected_entity_ids: Array.from(new Set([...cfg.selected_entity_ids, ...ids])) }
  }

  if (cfg.selected_entity_ids.length === 0) add(entities.filter((e) => e.type === 'education').map((e) => e.id))
  const applyAi = !!ai && cfg.ai_applied_at !== ai.analyzed_at
  if (applyAi) {
    add(ai.recommended_experience_ids)
    add(ai.recommended_project_ids)
    add(ai.recommended_skill_ids)
    cfg = { ...cfg, ai_applied_at: ai.analyzed_at }
  }

  if (applyAi && ai.recommended_skill_tags && Object.keys(ai.recommended_skill_tags).length > 0) {
    const overrides = { ...(cfg.skill_tag_overrides ?? {}) }
    for (const [skillId, tags] of Object.entries(ai.recommended_skill_tags)) {
      const skill = entities.find((e) => e.id === skillId) as SkillMeta | undefined
      // The AI only narrows the tags, and never replaces a choice the user made.
      if (skill && tags.length < skill.tags.length && !overrides[skillId]) overrides[skillId] = tags
    }
    cfg = { ...cfg, skill_tag_overrides: overrides }
  }

  for (const type of ['experiences', 'projects'] as const) {
    const key = ORDER_KEY[type]
    if (cfg[key]?.length) continue
    const selected = cfg.selected_entity_ids.filter((id) => entities.some((e) => e.id === id && e.type === type))
    if (selected.length > 0) cfg = { ...cfg, [key]: selected }
  }
  return cfg
}
