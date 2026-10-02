import { z } from 'zod'

export const GenerateResumeSchema = z
  .object({
    jobId: z.string().min(1).max(100).optional(),
    entityIds: z.array(z.string().max(100)).max(500).optional(),
    skillTagOverrides: z.record(z.string(), z.array(z.string())).optional(),
    template: z.string().regex(/^[a-z0-9][a-z0-9-]{0,39}$/).optional(),
    options: z.record(z.string(), z.union([z.string().max(100), z.number()])).optional(),
  })
  .refine((v) => v.jobId !== undefined || v.entityIds !== undefined, {
    error: 'Provide a jobId or a list of entityIds',
    path: ['entityIds'],
  })

export type GenerateResumeRequest = z.infer<typeof GenerateResumeSchema>
