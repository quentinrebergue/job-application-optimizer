/**
 * call-handlers-jobs.ts
 *
 * MCP tool call handlers for job-tracking tools (create_job, tag_job,
 * list_jobs, update_job_status, set_job_profile, rank_job_offer,
 * analyze_job_for_resume).
 */

import { readJob, listJobs, createJob, updateJobStatus, setJobProfile, setJobAiContext, updateJobTags, type ApplicationStatus } from './jobs.js'
import type { ToolResult } from './tool-result.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function handleJobToolCall(name: string, args: Record<string, any>): Promise<ToolResult | null> {
  if (name === 'create_job') {
    const { title, company, description = '', location, url, status = 'saved', tags } = args as {
      title: string; company: string; description?: string; location?: string; url?: string; status?: string; tags?: string[]
    }
    if (!title?.trim() || !company?.trim()) {
      return { content: [{ type: 'text', text: 'Error: title and company are required.' }], isError: true }
    }
    const job = await createJob({ title, company, description, location, url, status, tags })
    return {
      content: [{
        type: 'text',
        text: `✓ Created "${job.title}" at ${job.company}\n  ID: ${job.id}\n  Location: ${job.location || '(not specified)'}\n  Status: ${job.status}\n  Tags: ${job.tags.length ? job.tags.join(', ') : '(none)'}\n  View: http://localhost:3000/jobs/${job.id}`,
      }],
    }
  }

  if (name === 'tag_job') {
    const { id, tags } = args as { id: string; tags: string[] }
    const job = await updateJobTags(id, tags)
    if (!job) return { content: [{ type: 'text', text: `Error: job "${id}" not found` }], isError: true }
    return { content: [{ type: 'text', text: `✓ Updated tags for "${job.title}": ${tags.join(', ')}` }] }
  }

  if (name === 'list_jobs') {
    const jobs = await listJobs()
    if (jobs.length === 0) return { content: [{ type: 'text', text: 'No jobs tracked yet.' }] }
    const lines = jobs.map((j) => `[${j.status.padEnd(9)}]  ${j.title} @ ${j.company}  (${j.id})`)
    return { content: [{ type: 'text', text: lines.join('\n') }] }
  }

  if (name === 'update_job_status') {
    const { id, status } = args as { id: string; status: ApplicationStatus }
    const result = await updateJobStatus(id, status)
    if (!result) {
      return { content: [{ type: 'text', text: `Error: job "${id}" not found. Use list_jobs to find valid IDs.` }], isError: true }
    }
    return { content: [{ type: 'text', text: `✓ "${result.job.title}" @ ${result.job.company}: ${result.prev} → ${status}` }] }
  }

  if (name === 'set_job_profile') {
    const { id, profile_text } = args as { id: string; profile_text: string }
    await setJobProfile(id, profile_text)
    const msg = profile_text.trim()
      ? `✓ Profile set for job ${id} (${profile_text.length} chars).`
      : `✓ Profile cleared for job ${id} — will use default.`
    return { content: [{ type: 'text', text: msg }] }
  }

  if (name === 'rank_job_offer') {
    const { id, provider } = args as { id: string; provider?: 'gemini' | 'claude' }
    const job = await readJob(id)
    if (!job) {
      return { content: [{ type: 'text', text: `Error: job "${id}" not found. Use list_jobs to find valid IDs.` }], isError: true }
    }
    try {
      // Call the API endpoint to trigger AI ranking
      const response = await fetch('http://localhost:3000/api/jobs/' + id + '/rank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      })
      if (!response.ok) {
        const error = await response.text()
        throw new Error(`API returned ${response.status}: ${error}`)
      }
      const analysis = await response.json()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const topExperiences = analysis.entities_by_type.experiences.slice(0, 3).map((e: any) => `${e.name} (${e.score})`).join(', ')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const topProjects = analysis.entities_by_type.projects.slice(0, 3).map((p: any) => `${p.name} (${p.score})`).join(', ')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const topSkills = analysis.entities_by_type.skills.slice(0, 5).map((s: any) => `${s.name} (${s.score})`).join(', ')
      return {
        content: [{
          type: 'text',
          text: `✓ AI Analysis Complete for "${job.title}" @ ${job.company}\n\nATS Tags: ${analysis.ats_tags.join(', ')}\nConfidence: ${(analysis.confidence_score * 100).toFixed(0)}%\n\nTop Matches:\n• Experiences: ${topExperiences || '(none)'}\n• Projects: ${topProjects || '(none)'}\n• Skills: ${topSkills || '(none)'}\n\nSummary: ${analysis.summary}`,
        }],
      }
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error ranking job: ${error instanceof Error ? error.message : 'Unknown error'}\n\nMake sure the server is running on localhost:3000 and GEMINI_API_KEY (or ANTHROPIC_API_KEY, if provider: "claude" was requested) is set.`,
        }],
        isError: true,
      }
    }
  }

  if (name === 'analyze_job_for_resume') {
    const { id, context, provider } = args as { id: string; context?: string; provider?: 'gemini' | 'claude' }
    const job = await readJob(id)
    if (!job) {
      return { content: [{ type: 'text', text: `Error: job "${id}" not found. Use list_jobs to find valid IDs.` }], isError: true }
    }
    try {
      // Optionally persist context so the rank endpoint picks it up
      if (context?.trim()) {
        await setJobAiContext(id, context.trim())
      }

      const response = await fetch('http://localhost:3000/api/jobs/' + id + '/rank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      })
      if (!response.ok) {
        const error = await response.text()
        throw new Error(`API returned ${response.status}: ${error}`)
      }
      const analysis = await response.json()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fmt = (list: any[], limit: number) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        list.slice(0, limit).map((e: any) => `  • ${e.name} — ${e.score}%: ${e.reason}`).join('\n')

      const tipsText = analysis.resume_tips?.length
        ? '\nResume Tips:\n' + analysis.resume_tips.map((t: string) => `  → ${t}`).join('\n')
        : ''

      const titleText = analysis.recommended_title
        ? `\nAI-suggested title: ${analysis.recommended_title}`
        : ''
      const profileText = analysis.recommended_profile
        ? `\nAI-suggested profile:\n${analysis.recommended_profile}`
        : ''

      const recExp = (analysis.recommended_experience_ids || [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((id: string) => analysis.entities_by_type.experiences.find((e: any) => e.id === id)?.name)
        .filter(Boolean).join(', ')
      const recProj = (analysis.recommended_project_ids || [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((id: string) => analysis.entities_by_type.projects.find((p: any) => p.id === id)?.name)
        .filter(Boolean).join(', ')
      const recSkills = (analysis.recommended_skill_ids || [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((id: string) => analysis.entities_by_type.skills.find((s: any) => s.id === id)?.name)
        .filter(Boolean).join(', ')

      return {
        content: [{
          type: 'text',
          text: [
            `✓ AI Analysis — "${job.title}" @ ${job.company}`,
            `Confidence: ${(analysis.confidence_score * 100).toFixed(0)}%`,
            `ATS Tags: ${analysis.ats_tags.join(', ')}`,
            '',
            `Summary: ${analysis.summary}`,
            tipsText,
            titleText,
            profileText,
            '',
            `Recommended experiences: ${recExp || '(none)'}`,
            `Recommended projects: ${recProj || '(none)'}`,
            `Recommended skills: ${recSkills || '(none)'}`,
            '',
            'Top Experiences:',
            fmt(analysis.entities_by_type.experiences, 4),
            '',
            'Top Projects:',
            fmt(analysis.entities_by_type.projects, 5),
            '',
            'Top Skills:',
            fmt(analysis.entities_by_type.skills, 6),
          ].join('\n'),
        }],
      }
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error analyzing job: ${error instanceof Error ? error.message : 'Unknown error'}\n\nMake sure the server is running on localhost:3000 and GEMINI_API_KEY is set.`,
        }],
        isError: true,
      }
    }
  }

  return null
}
