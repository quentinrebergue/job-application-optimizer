import { z } from 'zod'

export const KnowledgeMetaSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  tags: z.array(z.string()).default([]),
})
