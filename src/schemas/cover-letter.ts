import { z } from 'zod'
import { COVER_LETTER_CATEGORIES } from '@/types/cover-letter'

export const CoverLetterCategorySchema = z.enum(
  COVER_LETTER_CATEGORIES as [string, ...string[]]
)

export const CoverLetterSentenceSchema = z.object({
  id: z.string(),
  text: z.string(),
  category: CoverLetterCategorySchema,
  tags: z.array(z.string()).default([]),
  created_at: z.string(),
})

export const JobCoverLetterConfigSchema = z.object({
  selected_sentence_ids: z.array(z.string()).default([]),
  generated_letter: z.string().default(''),
  ai_context: z.string().default(''),
})
