import { z } from 'zod'
import { APPLICATION_STATUSES } from '@/config/constants'

export const ApplicationStatusSchema = z.enum(APPLICATION_STATUSES)

export const AIRankingSchema = z.object({
  entity_id: z.string(),
  score: z.number().min(0).max(1),
})

export const SuggestedSkillSchema = z.object({
  name: z.string(),
  category: z.string(),
  level: z.string().default('intermediate'),
  tags: z.array(z.string()).default([]),
  reason: z.string(),
})

export const SuggestedSkillTagSchema = z.object({
  skill_id: z.string(),
  tag: z.string(),
  reason: z.string(),
})

export const EntityRankingResultSchema = z.object({
  id: z.string(),
  type: z.enum(['experience', 'project', 'skill', 'education']),
  name: z.string(),
  level: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]).optional(),
  rank: z.number().int().min(1).optional(),
  score: z.number().min(0).max(100).optional(),
  reason: z.string().default(''),
})

export const AIAnalysisResultSchema = z.object({
  job_id: z.string(),
  analyzed_at: z.string(),
  ats_tags: z.array(z.string()),
  entities_by_type: z.object({
    experiences: z.array(EntityRankingResultSchema),
    projects: z.array(EntityRankingResultSchema),
    skills: z.array(EntityRankingResultSchema),
    education: z.array(EntityRankingResultSchema),
  }),
  confidence_score: z.number().min(0).max(1).optional(),
  summary: z.string().optional(),
  resume_tips: z.array(z.string()).optional(),
  recommended_title: z.string().optional(),
  recommended_profile: z.string().optional(),
  recommended_experience_ids: z.array(z.string()).default([]),
  recommended_project_ids: z.array(z.string()).default([]),
  recommended_skill_ids: z.array(z.string()).default([]),
  recommended_skill_tags: z.record(z.string(), z.array(z.string())).default({}),
  suggested_new_skills: z.array(SuggestedSkillSchema).default([]),
  suggested_new_skill_tags: z.array(SuggestedSkillTagSchema).default([]),
  recommended_entity_descriptions: z.record(z.string(), z.string()).optional(),
})

export const ResumeConfigSchema = z.object({
  selected_entity_ids: z.array(z.string()),
  ai_rankings: z.array(AIRankingSchema),
  profile_text: z.string().default(''),
  resume_title: z.string().default(''),
  ai_context: z.string().default(''),
  ai_applied_at: z.string().optional(),
  show_project_tech: z.boolean().optional(),
  description_variant: z.record(z.string(), z.string()).optional(),
  skill_tag_overrides: z.record(z.string(), z.array(z.string())).optional(),
  entity_description_overrides: z.record(z.string(), z.string()).optional(),
  project_order: z.array(z.string()).optional(),
  experience_order: z.array(z.string()).optional(),
  resume_template: z.string().optional(),
  resume_options: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
})

export const JobOfferSchema = z.object({
  id: z.string(),
  company: z.string(),
  title: z.string(),
  description: z.string(),
  location: z.string().optional(),
  url: z.string().optional(),
  status: ApplicationStatusSchema,
  date_added: z.string(),
  tags: z.array(z.string()).default([]),
  ats_tags: z.array(z.string()).optional(),
  ai_analysis: AIAnalysisResultSchema.optional(),
})
