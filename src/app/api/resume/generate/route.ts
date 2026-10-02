import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getJob, getResumeProfile, listEntities } from '@/lib/data'
import { ENTITY_TYPE_IDS } from '@/config'
import { getSessionUserId } from '@/lib/auth/session'
import { buildPayload, type PayloadConfig } from '@/lib/resume/build-payload'
import { RenderError, renderPdf } from '@/lib/resume/renderer-client'
import { GenerateResumeSchema } from '@/schemas/resume-generate'

const DEFAULT_TEMPLATE = 'classic'

export async function POST(request: Request) {
  const userId = await getSessionUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const parsed = GenerateResumeSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', fields: z.flattenError(parsed.error).fieldErrors },
      { status: 400 },
    )
  }
  const { jobId, entityIds, template, options, skillTagOverrides } = parsed.data

  const profile = await getResumeProfile(userId)
  if (!profile.full_name) {
    return NextResponse.json(
      { error: 'Add your full name in the resume profile before generating a PDF.', code: 'profile_incomplete' },
      { status: 422 },
    )
  }

  const job = jobId ? await getJob(userId, jobId) : null
  if (jobId && !job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  // Explicit ids win over the job's saved selection, as before.
  const selectedIds = new Set(entityIds ?? job?.resume_config.selected_entity_ids ?? [])
  const entities = (await Promise.all(ENTITY_TYPE_IDS.map((t) => listEntities(userId, t))))
    .flat()
    .filter((e) => selectedIds.has(e.id))

  const config: Partial<PayloadConfig> = { ...job?.resume_config }
  if (skillTagOverrides) config.skill_tag_overrides = skillTagOverrides

  const payload = buildPayload({
    templateId: template ?? job?.resume_config.resume_template ?? DEFAULT_TEMPLATE,
    options: options ?? job?.resume_config.resume_options,
    profile,
    config,
    entities,
  })

  try {
    const pdf = await renderPdf(payload)
    return new Response(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${jobId ? `resume-${jobId}` : 'resume'}.pdf"`,
        'Content-Length': String(pdf.byteLength),
      },
    })
  } catch (err) {
    if (!(err instanceof RenderError)) throw err
    if (err.status >= 500) console.error('resume render failed', { code: err.code, message: err.message })
    return NextResponse.json({ error: err.message, code: err.code, problems: err.problems }, { status: err.status })
  }
}
