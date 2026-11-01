import { z } from 'zod'
import { LIMITS } from '@/config/limits'
import { normalizeGithub } from '@/lib/web-link'

// The renderer service accepts up to 5000 characters per field; the limits (config/limits.ts)
// are tighter on the short ones so a typo cannot fill a CV header.
const text = (max: number) => z.string().trim().max(max).default('')

export const ResumeProfileSchema = z.object({
  full_name: text(LIMITS.profile.full_name),
  email: text(LIMITS.profile.email).refine((v) => v === '' || z.email().safeParse(v).success, {
    error: 'Invalid email address',
  }),
  linkedin: text(LIMITS.profile.linkedin),
  // `github.com/name`; a bare user name is completed (#322). Empty is fine: nothing is printed then.
  github: z
    .string()
    .trim()
    .max(LIMITS.profile.github)
    .refine((v) => normalizeGithub(v) !== null, { error: 'Enter your GitHub address (github.com/name) or just your user name' })
    .transform((v) => normalizeGithub(v) ?? '')
    .default(''),
  phone: text(LIMITS.profile.phone),
  address: text(LIMITS.profile.address),
  resume_title: text(LIMITS.profile.resume_title),
  profile_text: text(LIMITS.profile.profile_text),
  ai_context: text(LIMITS.profile.ai_context),
})

export type ResumeProfile = z.infer<typeof ResumeProfileSchema>
