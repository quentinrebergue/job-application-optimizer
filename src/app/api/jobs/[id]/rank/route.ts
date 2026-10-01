import { getJob, updateJob } from '@/lib/data'
import { listEntities } from '@/lib/data'
import { rankJobWithAI, isAIProvider, type AIProvider } from '@/lib/ai'
import path from 'path'
import fs from 'fs/promises'
import { getSessionUserId } from '@/lib/auth/session'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId()
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { id } = await params

    // Which AI provider to use — defaults to Gemini to preserve prior behaviour
    // when the caller (older UI, MCP tool) doesn't pass one.
    const body = await request.json().catch(() => ({}))
    const requestedProvider = (body as { provider?: unknown }).provider
    const provider: AIProvider = isAIProvider(requestedProvider) ? requestedProvider : 'gemini'

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

    // Merge job-specific ai_context with global default fallback
    let aiContext = job.resume_config.ai_context ?? ''
    if (!aiContext.trim()) {
      try {
        const defaultsPath = path.join(process.cwd(), 'data', 'resume', 'defaults.json')
        const raw = await fs.readFile(defaultsPath, 'utf-8')
        aiContext = JSON.parse(raw).ai_context ?? ''
      } catch { /* no defaults file */ }
    }

    // Call AI ranking
    const analysis = await rankJobWithAI(provider, job.title, job.company, job.description, {
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

    // Remove ai_analysis and ats_tags by rewriting offer.json without them
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { ai_analysis: _ai, ats_tags: _tags, ...rest } = job
    const offerPath = path.join(process.cwd(), 'data', 'jobs', id, 'offer.json')
    await fs.writeFile(offerPath, JSON.stringify({ ...rest, ats_tags: [] }, null, 2))
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
