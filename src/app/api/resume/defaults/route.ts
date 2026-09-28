import path from 'path'
import fs from 'fs/promises'
import { z } from 'zod'

const DEFAULTS_PATH = path.join(process.cwd(), 'data', 'resume', 'defaults.json')

export const ResumeDefaultsSchema = z.object({
  resume_title: z.string().default(''),
  profile_text: z.string().default(''),
  ai_context: z.string().default(''),
})

export type ResumeDefaults = z.infer<typeof ResumeDefaultsSchema>

async function readDefaults(): Promise<ResumeDefaults> {
  try {
    const raw = await fs.readFile(DEFAULTS_PATH, 'utf-8')
    return ResumeDefaultsSchema.parse(JSON.parse(raw))
  } catch {
    return ResumeDefaultsSchema.parse({})
  }
}

export async function GET() {
  const defaults = await readDefaults()
  return Response.json(defaults)
}

export async function PUT(request: Request) {
  const body = await request.json()
  const defaults = ResumeDefaultsSchema.parse(body)
  await fs.writeFile(DEFAULTS_PATH, JSON.stringify(defaults, null, 2))
  return Response.json(defaults)
}
