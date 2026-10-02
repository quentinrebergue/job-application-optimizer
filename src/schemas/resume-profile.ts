import { z } from 'zod'

// The renderer service accepts up to 5000 characters per field; these limits
// are tighter on the short ones so a typo cannot fill a CV header.
const text = (max: number) => z.string().trim().max(max).default('')

export const ResumeProfileSchema = z.object({
  full_name: text(200),
  email: text(320).refine((v) => v === '' || z.email().safeParse(v).success, {
    error: 'Invalid email address',
  }),
  linkedin: text(300),
  phone: text(50),
  address: text(300),
  resume_title: text(200),
  profile_text: text(5000),
  ai_context: text(5000),
})

export type ResumeProfile = z.infer<typeof ResumeProfileSchema>
