/**
 * project-analyzer.ts
 *
 * Reads a project from disk (or from data/projects/{name}/description.md)
 * and uses GPT to generate a full project profile:
 * - README.md content
 * - Resume title + description
 * - Technology list
 * - Taxonomy-aligned tags
 * - LaTeX snippet
 * - 5 interview Q&A pairs
 */

import fs from 'fs/promises'
import path from 'path'

// Folders to skip when scanning source files
const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', 'out', '__pycache__',
  '.next', 'target', 'vendor', 'coverage', '.cache', 'venv', '.venv',
])

// Config / manifest filenames to always include
const CONFIG_FILES = new Set([
  'package.json', 'Cargo.toml', 'CMakeLists.txt', 'Makefile', 'meson.build',
  'pyproject.toml', 'setup.py', 'go.mod', 'pom.xml', 'build.gradle',
  'Dockerfile', 'docker-compose.yml', '.env.example',
])

// Main source entry-points to include
const ENTRY_FILES = [
  'main.c', 'main.cpp', 'main.rs', 'main.go', 'main.py', 'main.ts',
  'index.ts', 'index.js', 'src/main.c', 'src/main.cpp', 'src/main.rs',
  'src/main.py', 'src/index.ts', 'src/lib.rs', 'lib.rs',
]

const MAX_TOTAL_CHARS = 12_000 // keep prompt manageable
const MAX_FILE_CHARS = 3_000

async function readTruncated(fp: string, maxChars = MAX_FILE_CHARS): Promise<string | null> {
  try {
    const raw = await fs.readFile(fp, 'utf-8')
    return raw.length > maxChars ? raw.slice(0, maxChars) + '\n...(truncated)' : raw
  } catch {
    return null
  }
}

/** Collect the most relevant text from a project directory */
export async function readProjectFiles(projectPath: string): Promise<string> {
  const sections: string[] = []
  let totalChars = 0

  const add = (label: string, content: string) => {
    if (totalChars >= MAX_TOTAL_CHARS) return
    const trimmed = content.slice(0, MAX_FILE_CHARS)
    sections.push(`### ${label}\n${trimmed}`)
    totalChars += trimmed.length
  }

  // 1. README (highest priority)
  for (const name of ['README.md', 'README.rst', 'README']) {
    const content = await readTruncated(path.join(projectPath, name))
    if (content) { add(name, content); break }
  }

  // 2. Config / manifest files
  for (const name of CONFIG_FILES) {
    if (totalChars >= MAX_TOTAL_CHARS) break
    const content = await readTruncated(path.join(projectPath, name), 1500)
    if (content) add(name, content)
  }

  // 3. Known entry-point source files
  for (const rel of ENTRY_FILES) {
    if (totalChars >= MAX_TOTAL_CHARS) break
    const content = await readTruncated(path.join(projectPath, rel))
    if (content) add(rel, content)
  }

  // 4. Any top-level .md files (docs, architecture notes)
  try {
    const entries = await fs.readdir(projectPath)
    for (const f of entries) {
      if (totalChars >= MAX_TOTAL_CHARS) break
      if (f.endsWith('.md') && f.toLowerCase() !== 'readme.md') {
        const content = await readTruncated(path.join(projectPath, f), 1500)
        if (content) add(f, content)
      }
    }
  } catch { /* directory unreadable */ }

  return sections.join('\n\n')
}

/** Read from the app's data/projects/{name}/ staging area */
export async function readStagingProject(dataDir: string, name: string): Promise<string> {
  const dir = path.join(dataDir, 'projects', name)
  const parts: string[] = []

  const desc = await readTruncated(path.join(dir, 'description.md'))
  if (desc) parts.push(`### description.md\n${desc}`)

  const info = await readTruncated(path.join(dir, 'info.json'), 500)
  if (info) parts.push(`### info.json\n${info}`)

  return parts.join('\n\n') || `(no files found in data/projects/${name}/)`
}

/** List project names in the staging area */
export async function listStagingProjects(dataDir: string): Promise<string[]> {
  const dir = path.join(dataDir, 'projects')
  try {
    const entries = await fs.readdir(dir)
    return entries.filter((e) => !e.startsWith('.'))
  } catch {
    return []
  }
}

export interface ProjectAnalysis {
  title: string
  tech: string[]
  description: string
  tags: string[]
  readme: string
  latex_snippet: string
  questions: Array<{ question: string; answer: string }>
}

/** Send project context to GPT and get a full structured analysis */
export async function analyzeProject(context: string, hint?: string): Promise<ProjectAnalysis> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set')

  const { default: OpenAI } = await import('openai')
  const client = new OpenAI({ apiKey })

  const prompt = `You are a senior software engineer and technical writer. Analyze the following project and produce a structured JSON response.${hint ? `\nProject name hint: "${hint}"` : ''}

PROJECT CONTENT:
${context}

Produce a JSON object with exactly these fields:
{
  "title": "Short human-readable project title",
  "tech": ["C", "Linux", "..."],             // technology names used, 3-10 items
  "description": "2-3 sentence resume-style description highlighting what was built, how, and the impact",
  "tags": ["linux", "containers", "C", "..."], // 4-8 lowercase taxonomy-friendly tags matching the tech used
  "readme": "Full Markdown README (# Title, ## Overview, ## Features, ## Tech Stack, ## How it works, ## Build & Run)",
  "latex_snippet": "\\\\item \\\\textbf{Title} -- One resume bullet point sentence suitable for a LaTeX resume",
  "questions": [
    { "question": "Technical interview question about the project", "answer": "Detailed answer..." },
    { "question": "...", "answer": "..." },
    { "question": "...", "answer": "..." },
    { "question": "...", "answer": "..." },
    { "question": "...", "answer": "..." }
  ]
}

Return ONLY the JSON object.`

  const completion = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  })

  const raw = completion.choices[0]?.message?.content ?? '{}'
  return JSON.parse(raw) as ProjectAnalysis
}
