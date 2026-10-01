import { NextResponse } from 'next/server'
import { getJob, listEntities, saveResumeConfig } from '@/lib/data'
import { rankEntities } from '@/lib/ai'
import { ENTITY_TYPE_IDS } from '@/config'
import { getSessionUserId } from '@/lib/auth/session'

export async function POST(request: Request) {
  const userId = await getSessionUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { jobId } = (await request.json()) as { jobId?: string }
    if (!jobId) {
      return NextResponse.json({ error: 'jobId is required' }, { status: 400 })
    }

    const job = await getJob(userId, jobId)
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    const allEntities = (
      await Promise.all(ENTITY_TYPE_IDS.map((t) => listEntities(userId, t)))
    ).flat()

    const rankings = await rankEntities(userId, job.description, allEntities)

    const updatedConfig = { ...job.resume_config, ai_rankings: rankings }
    await saveResumeConfig(userId, jobId, updatedConfig)

    return NextResponse.json({ rankings })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ranking failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
