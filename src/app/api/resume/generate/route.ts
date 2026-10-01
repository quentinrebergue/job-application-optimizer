import { NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs/promises'
import { getJob, listEntities } from '@/lib/data'
import { getTemplate, injectEntities, saveGeneratedTex, compilePDF } from '@/lib/latex'
import { ENTITY_TYPE_IDS } from '@/config'
import { getSessionUserId } from '@/lib/auth/session'

export async function POST(request: Request) {
  const userId = await getSessionUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = (await request.json()) as {
      jobId?: string
      entityIds?: string[]
      skillTagOverrides?: Record<string, string[]>
    }
    const { jobId, entityIds: bodyEntityIds } = body
    let skillTagOverrides = body.skillTagOverrides
    if (!jobId) {
      return NextResponse.json({ error: 'jobId is required' }, { status: 400 })
    }

    // Fetch all entities first (needed for both job-based and direct entity lists)
    const allEntities = (
      await Promise.all(ENTITY_TYPE_IDS.map((t) => listEntities(userId, t)))
    ).flat()

    let selectedEntities = allEntities
    let profileText: string | undefined
    let resumeTitle: string | undefined

    // Always load job config to get profile_text and default skill_tag_overrides
    const job = await getJob(userId, jobId)
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Determine which entities to use:
    // - If bodyEntityIds provided, use those (explicit entity selection)
    // - Otherwise use job's selected entities
    if (bodyEntityIds) {
      selectedEntities = allEntities.filter((e) => bodyEntityIds.includes(e.id))
    } else {
      selectedEntities = allEntities.filter((e) =>
        job.resume_config.selected_entity_ids.includes(e.id)
      )
    }

    // Always load profile_text, resume_title and skill_tag_overrides from job config
    profileText = job.resume_config.profile_text
    resumeTitle = job.resume_config.resume_title
    if (!skillTagOverrides) {
      skillTagOverrides = job.resume_config.skill_tag_overrides
    }

    // Fall back to global defaults if the job's profile/title are empty
    if (!profileText?.trim() || !resumeTitle?.trim()) {
      try {
        const defaultsPath = path.join(process.cwd(), 'data', 'resume', 'defaults.json')
        const raw = await fs.readFile(defaultsPath, 'utf-8')
        const defaults = JSON.parse(raw)
        if (!profileText?.trim()) profileText = defaults.profile_text ?? ''
        if (!resumeTitle?.trim()) resumeTitle = defaults.resume_title ?? ''
      } catch { /* no defaults */ }
    }

    const template = await getTemplate()
    const projectOrder = job.resume_config.project_order
    const entityDescriptionOverrides = job.resume_config.entity_description_overrides
    const experienceOrder = job.resume_config.experience_order
    const tex = await injectEntities(template, selectedEntities, profileText, skillTagOverrides, projectOrder, resumeTitle, entityDescriptionOverrides, experienceOrder)
    const texPath = await saveGeneratedTex(jobId, tex)
    const outputDir = path.dirname(texPath)

    try {
      const pdfPath = await compilePDF(texPath, outputDir)
      const pdfBytes = await fs.readFile(pdfPath)
      return new Response(pdfBytes, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="resume-${jobId}.pdf"`,
          'Content-Length': String(pdfBytes.length),
        },
      })
    } catch (compileError) {
      const message =
        compileError instanceof Error ? compileError.message : 'PDF compilation failed'
      return NextResponse.json({ error: message }, { status: 500 })
    }
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
