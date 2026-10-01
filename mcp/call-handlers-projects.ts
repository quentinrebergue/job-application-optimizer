/**
 * call-handlers-projects.ts
 *
 * MCP tool call handlers for staging and importing raw school/personal
 * projects from data/projects/ into resume entities.
 */

import fs from 'fs/promises'
import path from 'path'
import { DATA_DIR } from './config.js'
import { createProject } from './entities.js'
import { readProjectFiles, readStagingProject, listStagingProjects, analyzeProject } from './project-analyzer.js'
import type { ToolResult } from './tool-result.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function handleProjectToolCall(name: string, args: Record<string, any>): Promise<ToolResult | null> {
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

  return null
}
