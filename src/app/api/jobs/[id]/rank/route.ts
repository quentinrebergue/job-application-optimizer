import { getJob, getResumeProfile, updateJob } from '@/lib/data'
import { listEntities } from '@/lib/data'
import { rankJobWithAI } from '@/lib/ai'
import { AiGatewayError } from '@/lib/ai/gateway'
import { getSessionUserId } from '@/lib/auth/session'
import { findUserById } from '@/lib/data/users'
import { reserveAiCall, settleAiCall } from '@/lib/ai/usage'
import { outcomeOfFailure } from '@/lib/ai/failure'
import { checkPromptSize } from '@/lib/ai/prompt-size'
import { headerForPrompt } from '@/lib/ai/header'

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

    // The entries the AI rates (education is not rated: every entry stays available)
    const experiences = await listEntities(userId, 'experiences')
    const projects = await listEntities(userId, 'projects')
    const skills = await listEntities(userId, 'skills')

    // The title and the profile of this resume, adapted to the offer by the AI too (#294): the ones of this job, else the user's defaults.
    const profile = await getResumeProfile(userId)
    const header = {
      title: job.resume_config.resume_title?.trim() || profile.resume_title || '',
      profile: job.resume_config.profile_text?.trim() || profile.profile_text || '',
      fullName: profile.full_name || undefined,
    }

    // A prompt over the gateway's limit is refused here, with what to cut, before anything is reserved (#185).
    const size = checkPromptSize(job.title, job.company, job.description, { experiences, projects, skills }, undefined, headerForPrompt(header, header.fullName))
    if (!size.ok) return Response.json({ error: size.message, code: 'prompt_too_large' }, { status: 413 })

    // The limits (per user, and the site's monthly cap) are checked and the call is written down
    // before the AI is asked; it is settled with the real tokens, or as a failure (#203).
    const reservation = await reserveAiCall(userId, 'rank')
    if (reservation.denied) {
      return Response.json(
        { error: reservation.message, code: reservation.code },
        { status: reservation.status, headers: reservation.retryAfterSeconds ? { 'Retry-After': String(reservation.retryAfterSeconds) } : undefined },
      )
    }

    let result
    try {
      result = await rankJobWithAI(userId, job.title, job.company, job.description, { experiences, projects, skills }, header)
    } catch (error) {
      await settleAiCall(reservation, outcomeOfFailure(error))
      throw error
    }
    // The model left a type with nothing recommended and the code completed it: counted here, with ids only (#218).
    if (result.emptyTypes.length > 0) {
      console.warn('AI ranking: nothing recommended, completed', { userId, jobId: id, types: result.emptyTypes })
    }
    if (result.droppedProposals.length > 0) {
      console.warn('AI ranking: proposal refused', { userId, jobId: id, texts: result.droppedProposals })
    }
    await settleAiCall(reservation, {
      status: 'done',
      model: result.model,
      promptTokens: result.usage.prompt_tokens,
      completionTokens: result.usage.completion_tokens,
    })
    const analysis = result.analysis

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
