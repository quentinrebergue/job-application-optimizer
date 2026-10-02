import { z } from 'zod'
import { getSessionUserId } from '@/lib/auth/session'
import { getResumeProfile, saveResumeProfile } from '@/lib/data'
import { ResumeProfileSchema } from '@/schemas/resume-profile'

export async function GET() {
  const userId = await getSessionUserId()
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return Response.json(await getResumeProfile(userId))
}

export async function PUT(request: Request) {
  const userId = await getSessionUserId()
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = ResumeProfileSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: 'Invalid profile', fields: z.flattenError(parsed.error).fieldErrors },
      { status: 400 }
    )
  }
  return Response.json(await saveResumeProfile(userId, parsed.data))
}
