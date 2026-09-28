import { z } from 'zod'

export const ExerciseMetaSchema = z.object({
  id: z.string(),
  title: z.string(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  knowledge_ids: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  category: z.string().optional(),
  leetcode: z.number().optional(),
  /** Per-node overrides for the decision-tree justification text, keyed by node id */
  patternJustifications: z.record(z.string(), z.string()).optional(),
})
