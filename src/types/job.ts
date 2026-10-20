// Job application tracking types

export type ApplicationStatus =
  | 'saved'
  | 'applied'
  | 'interview'
  | 'offer'
  | 'rejected'

export interface AIRanking {
  entity_id: string
  score: number // 0–1
}

export interface ResumeConfig {
  selected_entity_ids: string[]
  ai_rankings: AIRanking[]
  profile_text: string
  /** One-line headline rendered in the resume header (e.g. "Software Engineer — Systems & Networking") */
  resume_title?: string
  /** Free-text context sent to the AI only — never rendered in the PDF */
  ai_context?: string
  /** The analysis (its `analyzed_at`) whose recommendations were applied to this selection: they are applied once, so what the user unticks stays unticked. */
  ai_applied_at?: string
  /** Which version of the description each entry prints for this job: entry id -> the name of one of its versions. Absent = the main description. */
  description_variant?: Record<string, string>
  /** Whether the resume prints the technologies under each project. Absent = it does (the first MAX_PROJECT_TECH of each). */
  show_project_tech?: boolean
  /** Per-skill tag overrides: skillId → selected tags. Absent = use all tags. */
  skill_tag_overrides?: Record<string, string[]>
  /** Per-entity description overrides: entityId → custom description. Absent = use original. */
  entity_description_overrides?: Record<string, string>
  /** Project display order: array of project IDs in desired order. Absent = use default order. */
  project_order?: string[]
  /** Experience display order: array of experience IDs in desired order. Absent = sort by end date, most recent first. */
  experience_order?: string[]
  /** Resume template chosen for this job (an id offered by the renderer service). Absent = default. */
  resume_template?: string
  /** Style options for that template (font size, colours...). Absent = the template's defaults. */
  resume_options?: Record<string, string | number>
}

export interface SuggestedSkill {
  name: string
  category: string
  level: string
  tags: string[]
  reason: string
}

export interface SuggestedSkillTag {
  skill_id: string
  tag: string
  /** Empty for rankings made since #184. */
  reason: string
}

export interface EntityRankingResult {
  id: string
  type: 'experience' | 'project' | 'skill' | 'education'
  name: string
  /** 0 none, 1 weak, 2 good, 3 strong; absent in rankings saved before the levels. */
  level?: 0 | 1 | 2 | 3
  /** Position in the AI's list, best first (1 = best). */
  rank?: number
  /** 0–100, only in rankings saved before the levels. */
  score?: number
  reason: string
}

/** Fields marked optional were asked of the AI before #184 and are only present in old rankings: nothing reads them. */
export interface AIAnalysisResult {
  job_id: string
  analyzed_at: string // ISO 8601
  ats_tags: string[]
  entities_by_type: {
    experiences: EntityRankingResult[]
    projects: EntityRankingResult[]
    skills: EntityRankingResult[]
    education: EntityRankingResult[]
  }
  confidence_score?: number // 0–1
  summary?: string
  resume_tips?: string[] // Actionable tips to improve the resume for this job
  recommended_title?: string // AI-suggested resume headline for this job
  recommended_profile?: string // AI-suggested profile/summary paragraph for this job
  recommended_experience_ids: string[]
  recommended_project_ids: string[]
  recommended_skill_ids: string[] // Top skill sections to include
  recommended_skill_tags: Record<string, string[]> // skill_id -> relevant tag subset
  suggested_new_skills: SuggestedSkill[] // Skills not in library but useful for this job
  suggested_new_skill_tags: SuggestedSkillTag[] // New tags to add to existing skills
  recommended_entity_descriptions?: Record<string, string> // entity_id -> ATS-tailored description (experiences + projects only)
}

export interface JobOffer {
  id: string
  company: string
  title: string
  description: string
  location?: string
  url?: string
  status: ApplicationStatus
  date_added: string // ISO 8601
  /** Taxonomy node ids or aliases extracted from the job description */
  tags: string[]
  /** ATS (Applicant Tracking System) tags identified by AI */
  ats_tags?: string[]
  /** AI ranking analysis results */
  ai_analysis?: AIAnalysisResult
}

export interface JobWithConfig extends JobOffer {
  resume_config: ResumeConfig
}
