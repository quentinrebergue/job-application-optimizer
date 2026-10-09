import { getSessionUserId } from '@/lib/auth/session'
import { getResumeProfile, saveResumeProfile } from '@/lib/data'
import { ResumeProfileSchema } from '@/schemas/resume-profile'
import { readJson } from '@/lib/validation/read-json'

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

  const body = await readJson(request, ResumeProfileSchema)
  if (!body.ok) return body.response
  return Response.json(await saveResumeProfile(userId, body.data))
}
