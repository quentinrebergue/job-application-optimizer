import { z } from 'zod'
import { LIMITS } from '@/config/limits'

// The renderer service accepts up to 5000 characters per field; the limits (config/limits.ts)
// are tighter on the short ones so a typo cannot fill a CV header.
const text = (max: number) => z.string().trim().max(max).default('')

export const ResumeProfileSchema = z.object({
  full_name: text(LIMITS.profile.full_name),
  email: text(LIMITS.profile.email).refine((v) => v === '' || z.email().safeParse(v).success, {
    error: 'Invalid email address',
  }),
  linkedin: text(LIMITS.profile.linkedin),
  phone: text(LIMITS.profile.phone),
  address: text(LIMITS.profile.address),
  resume_title: text(LIMITS.profile.resume_title),
  profile_text: text(LIMITS.profile.profile_text),
  ai_context: text(LIMITS.profile.ai_context),
})

export type ResumeProfile = z.infer<typeof ResumeProfileSchema>
