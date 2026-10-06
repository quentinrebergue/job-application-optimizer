import { z } from 'zod'

export const ExperienceMetaSchema = z.object({
  id: z.string(),
  type: z.literal('experiences'),
  title: z.string(),
  company: z.string(),
  location: z.string().optional().default(''),
  period: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
  latex_snippet: z.string().optional().default(''),
})

export const ProjectMetaSchema = z.object({
  id: z.string(),
  type: z.literal('projects'),
  title: z.string(),
  tech: z.array(z.string()),
  description: z.string(),
  tags: z.array(z.string()),
  latex_snippet: z.string().optional().default(''),
})

export const SkillMetaSchema = z.object({
  id: z.string(),
  type: z.literal('skills'),
  name: z.string(),
  category: z.string(),
  level: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
  tags: z.array(z.string()),
  latex_snippet: z.string().optional().default(''),
})

export const EducationMetaSchema = z.object({
  id: z.string(),
  type: z.literal('education'),
  degree: z.string(),
  institution: z.string(),
  period: z.string(),
  tags: z.array(z.string()),
  latex_snippet: z.string().optional().default(''),
})

export const EntityMetaSchema = z.discriminatedUnion('type', [
  ExperienceMetaSchema,
  ProjectMetaSchema,
  SkillMetaSchema,
  EducationMetaSchema,
])
