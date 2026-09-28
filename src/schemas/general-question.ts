import { z } from 'zod'

export const GeneralQuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  answer: z.string(),
  tags: z.array(z.string()),
})
