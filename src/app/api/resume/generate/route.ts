import { NextResponse } from 'next/server'
import { getJob, getResumeProfile, hasOtherJobAtCompany, listEntities } from '@/lib/data'
import { ENTITY_TYPE_IDS } from '@/config'
import { getSessionUserId } from '@/lib/auth/session'
import { buildPayload, type PayloadConfig } from '@/lib/resume/build-payload'
import { resumeFileName } from '@/lib/resume/file-name'
import { RenderError, renderPdf } from '@/lib/resume/renderer-client'
import { GenerateResumeSchema } from '@/schemas/resume-generate'
import { readJson } from '@/lib/validation/read-json'
import { consumeCreation } from '@/lib/quotas'

const DEFAULT_TEMPLATE = 'classic'

export async function POST(request: Request) {
  const userId = await getSessionUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const parsed = await readJson(request, GenerateResumeSchema)
  if (!parsed.ok) return parsed.response
  const { jobId, entityIds, template, options, skillTagOverrides } = parsed.data

  // The PDF is the heaviest call after the AI: counted per hour and per day.
  const limited = await consumeCreation(userId, 'pdf')
  if (limited) return limited

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

  // Named after the person and the company, not after the job's id (#293); the browser saves under this very name.
  const fileName = resumeFileName({
    fullName: profile.full_name,
    company: job?.company ?? '',
    title: job?.title ?? '',
    sharesCompany: job ? await hasOtherJobAtCompany(userId, job.id, job.company) : false,
  })

  try {
    const pdf = await renderPdf(payload)
    return new Response(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': String(pdf.byteLength),
      },
    })
  } catch (err) {
    if (!(err instanceof RenderError)) throw err
    if (err.status >= 500) console.error('resume render failed', { code: err.code, message: err.message })
    return NextResponse.json({ error: err.message, code: err.code, problems: err.problems }, { status: err.status })
  }
}
