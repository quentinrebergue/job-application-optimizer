import { getJob, updateJob, getResumeProfile } from '@/lib/data'
import { listEntities } from '@/lib/data'
import { rankJobWithAI } from '@/lib/ai'
import { AiGatewayError } from '@/lib/ai/gateway'
import { getSessionUserId } from '@/lib/auth/session'
import { findUserById } from '@/lib/data/users'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId()
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // The AI costs money: only confirmed accounts use it (#125).
  const user = await findUserById(userId)
  if (!user?.emailVerified) {
    return Response.json(
      { error: 'Confirm your email address to use the AI ranking: open the link we sent you, or send a new one from the banner at the top.' },
      { status: 403 },
    )
  }
  try {
    const { id } = await params

    // Get job details
    const job = await getJob(userId, id)
    if (!job) {
      return Response.json({ error: 'Job not found' }, { status: 404 })
    }

    // Get all entities
    const experiences = await listEntities(userId, 'experiences')
    const projects = await listEntities(userId, 'projects')
    const skills = await listEntities(userId, 'skills')
    const education = await listEntities(userId, 'education')

    // Merge job-specific ai_context with the user's profile default
    let aiContext = job.resume_config.ai_context ?? ''
    if (!aiContext.trim()) {
      aiContext = (await getResumeProfile(userId)).ai_context
    }
    // Call AI ranking
    const analysis = await rankJobWithAI(userId, job.title, job.company, job.description, {
      experiences,
      projects,
      skills,
      education,
    }, aiContext || undefined)

    // Attach job_id and save
    analysis.job_id = id

    // Save results to job
    await updateJob(userId, id, {
      ats_tags: analysis.ats_tags,
      ai_analysis: analysis,
    })

    return Response.json(analysis)
  } catch (error) {
    console.error('AI ranking error:', error)
    if (error instanceof AiGatewayError) {
      return Response.json({ error: error.message }, { status: error.status })
    }
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to rank job' },
      { status: 500 },
    )
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId()
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { id } = await params
    const job = await getJob(userId, id)
    if (!job) return Response.json({ error: 'Job not found' }, { status: 404 })

    // Jobs live in Postgres: clear the ranking through the data layer (#167).
    await updateJob(userId, id, { ai_analysis: undefined, ats_tags: [] })
    return Response.json({ ok: true })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to clear AI data' },
      { status: 500 },
    )
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId()
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { id } = await params
    const job = await getJob(userId, id)

    if (!job) {
      return Response.json({ error: 'Job not found' }, { status: 404 })
    }

    if (!job.ai_analysis) {
      return Response.json({ error: 'Job has not been ranked yet' }, { status: 404 })
    }

    return Response.json(job.ai_analysis)
  } catch (error) {
    console.error('Error fetching ranking:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch ranking' },
      { status: 500 },
    )
  }
}
