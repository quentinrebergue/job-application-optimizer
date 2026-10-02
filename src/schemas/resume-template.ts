import { z } from 'zod'

const TemplateOptionSchema = z.object({
  type: z.enum(['number', 'color', 'enum']),
  default: z.union([z.string(), z.number()]),
  min: z.number().optional(),
  max: z.number().optional(),
  values: z.array(z.string()).optional(),
})

export const TemplateInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().default(''),
  // The service sends null when a template declares no options.
  options: z
    .record(z.string(), TemplateOptionSchema)
    .nullish()
    .transform((options) => options ?? {}),
})

export const TemplateListSchema = z.object({ templates: z.array(TemplateInfoSchema) })

export type TemplateOption = z.infer<typeof TemplateOptionSchema>
export type TemplateInfo = z.infer<typeof TemplateInfoSchema>
