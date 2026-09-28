/**
 * call-handlers.ts
 *
 * Implements all MCP tool call handlers.
 * Each handler corresponds to a tool defined in tool-definitions.ts.
 *
 * Returns the MCP `content` response object for a given tool name + args.
 */

import fs from 'fs/promises'
import path from 'path'
import { DATA_DIR, JOBS_DIR } from './config.js'
import { readJob, listJobs, createJob, updateJobStatus, setJobProfile, updateJobTags, type ApplicationStatus } from './jobs.js'
import { createExperience, createProject, createSkill, createEducation, listEntities, type SkillLevel } from './entities.js'
import { readProjectFiles, readStagingProject, listStagingProjects, analyzeProject } from './project-analyzer.js'
import {
  getTaxonomy, createTaxonomyNode, updateTaxonomyNode, deleteTaxonomyNode,
  addTaxonomyAlias, removeTaxonomyAlias, reconcileTags,
} from './taxonomy.js'

type ToolResult = { content: { type: 'text'; text: string }[]; isError?: boolean }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function handleToolCall(name: string, args: Record<string, any>): Promise<ToolResult> {
  // ── Jobs ───────────────────────────────────────────────────────────────────

  if (name === 'create_job') {
    const { title, company, description = '', location, url, status = 'saved', tags } = args as {
      title: string; company: string; description?: string; location?: string; url?: string; status?: string; tags?: string[]
    }
    if (!title?.trim() || !company?.trim()) {
      return { content: [{ type: 'text', text: 'Error: title and company are required.' }], isError: true }
    }
    const job = await createJob(JOBS_DIR, { title, company, description, location, url, status, tags })
    return {
      content: [{
        type: 'text',
        text: `✓ Created "${job.title}" at ${job.company}\n  ID: ${job.id}\n  Location: ${job.location || '(not specified)'}\n  Status: ${job.status}\n  Tags: ${job.tags.length ? job.tags.join(', ') : '(none)'}\n  View: http://localhost:3000/jobs/${job.id}`,
      }],
    }
  }

  if (name === 'tag_job') {
    const { id, tags } = args as { id: string; tags: string[] }
    const job = await updateJobTags(JOBS_DIR, id, tags)
    if (!job) return { content: [{ type: 'text', text: `Error: job "${id}" not found` }], isError: true }
    return { content: [{ type: 'text', text: `✓ Updated tags for "${job.title}": ${tags.join(', ')}` }] }
  }

  if (name === 'list_jobs') {
    const jobs = await listJobs(JOBS_DIR)
    if (jobs.length === 0) return { content: [{ type: 'text', text: 'No jobs tracked yet.' }] }
    const lines = jobs.map((j) => `[${j.status.padEnd(9)}]  ${j.title} @ ${j.company}  (${j.id})`)
    return { content: [{ type: 'text', text: lines.join('\n') }] }
  }

  if (name === 'update_job_status') {
    const { id, status } = args as { id: string; status: ApplicationStatus }
    const result = await updateJobStatus(JOBS_DIR, id, status)
    if (!result) {
      return { content: [{ type: 'text', text: `Error: job "${id}" not found. Use list_jobs to find valid IDs.` }], isError: true }
    }
    return { content: [{ type: 'text', text: `✓ "${result.job.title}" @ ${result.job.company}: ${result.prev} → ${status}` }] }
  }

  if (name === 'set_job_profile') {
    const { id, profile_text } = args as { id: string; profile_text: string }
    await setJobProfile(JOBS_DIR, id, profile_text)
    const msg = profile_text.trim()
      ? `✓ Profile set for job ${id} (${profile_text.length} chars).`
      : `✓ Profile cleared for job ${id} — will use default.`
    return { content: [{ type: 'text', text: msg }] }
  }

  if (name === 'rank_job_offer') {
    const { id, provider } = args as { id: string; provider?: 'gemini' | 'claude' }
    const job = await readJob(JOBS_DIR, id)
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
      const topExperiences = analysis.entities_by_type.experiences.slice(0, 3).map((e: any) => `${e.name} (${e.score})`).join(', ')
      const topProjects = analysis.entities_by_type.projects.slice(0, 3).map((p: any) => `${p.name} (${p.score})`).join(', ')
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
    const job = await readJob(JOBS_DIR, id)
    if (!job) {
      return { content: [{ type: 'text', text: `Error: job "${id}" not found. Use list_jobs to find valid IDs.` }], isError: true }
    }
    try {
      // Optionally persist context so the rank endpoint picks it up
      if (context?.trim()) {
        const cfgPath = path.join(JOBS_DIR, id, 'resume-config.json')
        let cfg: Record<string, unknown> = {}
        try { cfg = JSON.parse(await fs.readFile(cfgPath, 'utf-8')) } catch { /* new */ }
        cfg.ai_context = context.trim()
        await fs.writeFile(cfgPath, JSON.stringify(cfg, null, 2))
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

      const fmt = (list: any[], limit: number) =>
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
        .map((id: string) => analysis.entities_by_type.experiences.find((e: any) => e.id === id)?.name)
        .filter(Boolean).join(', ')
      const recProj = (analysis.recommended_project_ids || [])
        .map((id: string) => analysis.entities_by_type.projects.find((p: any) => p.id === id)?.name)
        .filter(Boolean).join(', ')
      const recSkills = (analysis.recommended_skill_ids || [])
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

  // ── Entities ──────────────────────────────────────────────────────────────

  if (name === 'create_experience') {
    const { title, company, period, description, tags, latex_snippet } = args as {
      title: string; company: string; period: string; description: string; tags?: string[]; latex_snippet?: string
    }
    const entity = await createExperience(DATA_DIR, { title, company, period, description, tags, latex_snippet })
    return {
      content: [{
        type: 'text',
        text: `✓ Experience "${entity.title}" at ${entity.company} (${entity.period})\n  ID: ${entity.id}\n  View: http://localhost:3000/entities/experiences`,
      }],
    }
  }

  if (name === 'create_project') {
    const { title, tech, description, tags, latex_snippet } = args as {
      title: string; tech: string[]; description: string; tags?: string[]; latex_snippet?: string
    }
    const entity = await createProject(DATA_DIR, { title, tech, description, tags, latex_snippet })
    return {
      content: [{
        type: 'text',
        text: `✓ Project "${entity.title}" [${entity.tech.join(', ')}]\n  ID: ${entity.id}\n  View: http://localhost:3000/entities/projects`,
      }],
    }
  }

  if (name === 'create_skill') {
    const { name: skillName, category, level, tags, latex_snippet } = args as {
      name: string; category: string; level: SkillLevel; tags?: string[]; latex_snippet?: string
    }
    const entity = await createSkill(DATA_DIR, { name: skillName, category, level, tags, latex_snippet })
    return {
      content: [{
        type: 'text',
        text: `✓ Skill "${entity.name}" (${entity.category}, ${entity.level})\n  ID: ${entity.id}\n  View: http://localhost:3000/entities/skills`,
      }],
    }
  }

  if (name === 'create_education') {
    const { degree, institution, period, tags, latex_snippet } = args as {
      degree: string; institution: string; period: string; tags?: string[]; latex_snippet?: string
    }
    const entity = await createEducation(DATA_DIR, { degree, institution, period, tags, latex_snippet })
    return {
      content: [{
        type: 'text',
        text: `✓ Education "${entity.degree}" at ${entity.institution} (${entity.period})\n  ID: ${entity.id}\n  View: http://localhost:3000/entities/education`,
      }],
    }
  }

  if (name === 'list_entities') {
    const { type } = args as { type: 'experiences' | 'projects' | 'skills' | 'education' }
    const entities = await listEntities(DATA_DIR, type)
    if (entities.length === 0) return { content: [{ type: 'text', text: `No ${type} yet.` }] }
    const lines = entities.map((e) => {
      if (e.type === 'experiences') return `[${e.id}]  ${e.title} @ ${e.company} (${e.period})`
      if (e.type === 'projects') return `[${e.id}]  ${e.title} [${e.tech.join(', ')}]`
      if (e.type === 'education') return `[${e.id}]  ${e.degree} @ ${e.institution} (${e.period})`
      return `[${e.id}]  ${e.name} — ${e.category} (${e.level})`
    })
    return { content: [{ type: 'text', text: lines.join('\n') }] }
  }

  // ── General Q&A flashcards ────────────────────────────────────────────────

  if (name === 'add_general_question') {
    const { question, answer, tags = [] } = args as { question: string; answer: string; tags?: string[] }
    if (!question?.trim() || !answer?.trim()) {
      return { content: [{ type: 'text', text: 'Error: question and answer are required.' }], isError: true }
    }
    const { v4: uuidv4 } = await import('uuid')
    const id = `gq-${uuidv4().slice(0, 8)}`
    const gq = { id, question: question.trim(), answer: answer.trim(), tags }
    const gqPath = path.join(DATA_DIR, 'general-questions', `${id}.json`)
    await fs.writeFile(gqPath, JSON.stringify(gq, null, 2))
    return {
      content: [{
        type: 'text',
        text: `✓ Added flashcard "${id}"\n  Tags: ${tags.length ? tags.join(', ') : '(none)'}\n  Q: ${question.slice(0, 80)}${question.length > 80 ? '…' : ''}`,
      }],
    }
  }

  // ── Taxonomy ──────────────────────────────────────────────────────────────

  if (name === 'get_taxonomy') {
    const tax = await getTaxonomy()
    return { content: [{ type: 'text', text: JSON.stringify(tax, null, 2) }] }
  }

  if (name === 'create_taxonomy_node') {
    const { label, parent = null, aliases, description } = args as {
      label: string; parent?: string; aliases?: string[]; description?: string
    }
    const node = await createTaxonomyNode({ label, parent: parent ?? null, aliases, description })
    return { content: [{ type: 'text', text: `✓ Created node "${node.label}" (id: ${node.id})` }] }
  }

  if (name === 'update_taxonomy_node') {
    const { id, ...patch } = args as { id: string; label?: string; parent?: string; description?: string }
    const node = await updateTaxonomyNode(id, patch)
    if (!node) return { content: [{ type: 'text', text: `Error: node "${id}" not found` }], isError: true }
    return { content: [{ type: 'text', text: `✓ Updated node "${node.label}"` }] }
  }

  if (name === 'delete_taxonomy_node') {
    const { id, cascade = false } = args as { id: string; cascade?: boolean }
    const ok = await deleteTaxonomyNode(id, cascade)
    if (!ok) return { content: [{ type: 'text', text: `Error: node "${id}" not found` }], isError: true }
    return { content: [{ type: 'text', text: `✓ Deleted node "${id}"` }] }
  }

  if (name === 'add_node_alias') {
    const { nodeId, alias } = args as { nodeId: string; alias: string }
    const node = await addTaxonomyAlias(nodeId, alias)
    if (!node) return { content: [{ type: 'text', text: `Error: node "${nodeId}" not found` }], isError: true }
    return { content: [{ type: 'text', text: `✓ Added alias "${alias}" to "${node.label}"` }] }
  }

  if (name === 'remove_node_alias') {
    const { nodeId, alias } = args as { nodeId: string; alias: string }
    const node = await removeTaxonomyAlias(nodeId, alias)
    if (!node) return { content: [{ type: 'text', text: `Error: node "${nodeId}" not found` }], isError: true }
    return { content: [{ type: 'text', text: `✓ Removed alias "${alias}" from "${node.label}"` }] }
  }

  if (name === 'reconcile_tags') {
    const { tags } = args as { tags: string[] }
    const result = await reconcileTags(tags)
    const lines: string[] = []
    if (result.matched.length) {
      lines.push(`✓ Matched (${result.matched.length}):`)
      for (const m of result.matched) lines.push(`  • "${m.tag}" → ${m.path}`)
    }
    if (result.aliasable.length) {
      lines.push(`\n⚡ Should be added as alias (${result.aliasable.length}):`)
      for (const a of result.aliasable)
        lines.push(`  • "${a.tag}" → alias of "${a.label}" (${a.path}) — confidence ${(a.confidence * 100).toFixed(0)}%`)
      lines.push(`  → Use add_node_alias to register these.`)
    }
    if (result.novel.length) {
      lines.push(`\n🆕 Novel / not in taxonomy (${result.novel.length}):`)
      for (const n of result.novel) {
        const parent = n.suggestedParentLabel ? ` under "${n.suggestedParentLabel}"` : ' (root)'
        lines.push(`  • "${n.tag}" → suggested node: "${n.suggestedLabel}"${parent}`)
      }
      lines.push(`  → Use create_taxonomy_node to add these.`)
    }
    return { content: [{ type: 'text', text: lines.join('\n') || 'No tags to reconcile.' }] }
  }

  // ── Projects staging ──────────────────────────────────────────────────────

  if (name === 'list_raw_projects') {
    const projects = await listStagingProjects(DATA_DIR)
    if (projects.length === 0) {
      return { content: [{ type: 'text', text: 'No projects in data/projects/ yet.\nAdd a folder with description.md to get started.' }] }
    }
    return { content: [{ type: 'text', text: `Projects in data/projects/:\n${projects.map((p) => `  • ${p}`).join('\n')}` }] }
  }

  if (name === 'analyze_project') {
    const { name: projectName, projectPath } = args as { name?: string; projectPath?: string }
    if (!projectName && !projectPath) {
      return { content: [{ type: 'text', text: 'Error: provide name or projectPath' }], isError: true }
    }
    const context = projectPath
      ? await readProjectFiles(projectPath)
      : await readStagingProject(DATA_DIR, projectName!)
    if (!context) return { content: [{ type: 'text', text: `No readable files found` }], isError: true }
    const analysis = await analyzeProject(context, projectName)
    const summary = [
      `Title: ${analysis.title}`,
      `Tech: ${analysis.tech.join(', ')}`,
      `Tags: ${analysis.tags.join(', ')}`,
      ``,
      `Description:`,
      analysis.description,
      ``,
      `Q&A (${analysis.questions.length} questions generated):`,
      ...analysis.questions.map((q, i) => `  ${i + 1}. ${q.question}`),
      ``,
      `README (${analysis.readme.length} chars) — call import_project to write it.`,
      `LaTeX: ${analysis.latex_snippet}`,
    ].join('\n')
    return { content: [{ type: 'text', text: summary }] }
  }

  if (name === 'import_project') {
    const { name: projectName, projectPath, writeReadme = !!projectPath } = args as {
      name?: string; projectPath?: string; writeReadme?: boolean
    }
    if (!projectName && !projectPath) {
      return { content: [{ type: 'text', text: 'Error: provide name or projectPath' }], isError: true }
    }
    const context = projectPath
      ? await readProjectFiles(projectPath)
      : await readStagingProject(DATA_DIR, projectName!)
    if (!context) return { content: [{ type: 'text', text: `No readable files found` }], isError: true }

    const analysis = await analyzeProject(context, projectName)

    let readmePath: string | null = null
    if (writeReadme && projectPath) {
      readmePath = path.join(projectPath, 'README.md')
      await fs.writeFile(readmePath, analysis.readme)
    } else if (writeReadme && projectName) {
      readmePath = path.join(DATA_DIR, 'projects', projectName, 'README.generated.md')
      await fs.writeFile(readmePath, analysis.readme)
    }

    const entity = await createProject(DATA_DIR, {
      title: analysis.title,
      tech: analysis.tech,
      description: analysis.description,
      tags: analysis.tags,
      latex_snippet: analysis.latex_snippet,
      questions: analysis.questions,
    })

    const lines = [
      `✓ Created project entity "${entity.title}"`,
      `  ID: ${entity.id}`,
      `  Tech: ${entity.tech.join(', ')}`,
      `  Tags: ${entity.tags.join(', ')}`,
      `  Questions: ${analysis.questions.length}`,
      ...(readmePath ? [`  README written to: ${readmePath}`] : []),
      `  View: http://localhost:3000/entities/projects/${entity.id}`,
    ]
    return { content: [{ type: 'text', text: lines.join('\n') }] }
  }

  return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true }
}
