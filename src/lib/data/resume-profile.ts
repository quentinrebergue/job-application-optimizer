import { pool } from '@/lib/db'
import type { ResumeProfile } from '@/schemas/resume-profile'

const COLUMNS = 'full_name, email, linkedin, phone, address, resume_title, profile_text, ai_context'

const EMPTY_PROFILE: ResumeProfile = {
  full_name: '',
  email: '',
  linkedin: '',
  phone: '',
  address: '',
  resume_title: '',
  profile_text: '',
  ai_context: '',
}

export async function getResumeProfile(userId: string): Promise<ResumeProfile> {
  const { rows } = await pool.query<ResumeProfile>(
    `SELECT ${COLUMNS} FROM user_resume_profile WHERE user_id = $1`,
    [userId]
  )
  return rows[0] ?? EMPTY_PROFILE
}

export async function saveResumeProfile(userId: string, profile: ResumeProfile): Promise<ResumeProfile> {
  const { rows } = await pool.query<ResumeProfile>(
    `INSERT INTO user_resume_profile (user_id, ${COLUMNS})
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (user_id) DO UPDATE SET
       full_name = EXCLUDED.full_name,
       email = EXCLUDED.email,
       linkedin = EXCLUDED.linkedin,
       phone = EXCLUDED.phone,
       address = EXCLUDED.address,
       resume_title = EXCLUDED.resume_title,
       profile_text = EXCLUDED.profile_text,
       ai_context = EXCLUDED.ai_context,
       updated_at = now()
     RETURNING ${COLUMNS}`,
    [
      userId,
      profile.full_name,
      profile.email,
      profile.linkedin,
      profile.phone,
      profile.address,
      profile.resume_title,
      profile.profile_text,
      profile.ai_context,
    ]
  )
  return rows[0]
}
