import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { listExercises, getExercise, getJob, getTaxonomy, tagsOverlap } from '@/lib/data'
import type { CodingTestSession, Exercise } from '@/types'

const BodySchema = z.object({
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  count: z.number().int().min(1).max(1000).default(10),
  jobId: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  const { difficulty, count, jobId } = parsed.data

  const all = await listExercises()

  // Filter by difficulty
  let filtered = difficulty ? all.filter((e) => e.difficulty === difficulty) : all

  // Filter by job taxonomy if jobId provided
  if (jobId) {
    const job = await getJob(jobId)
    if (job && job.tags.length > 0) {
      const { nodes } = await getTaxonomy()
      filtered = filtered.filter(
        (ex) => ex.tags.length > 0 && tagsOverlap(ex.tags, job.tags, nodes)
      )
      // If taxonomy filtering yields nothing, fall back to unfiltered (by difficulty only)
      if (filtered.length === 0) {
        filtered = difficulty ? all.filter((e) => e.difficulty === difficulty) : all
      }
    }
  }

  // Shuffle and limit
  const shuffled = [...filtered].sort(() => Math.random() - 0.5).slice(0, count)

  // Load full exercise content
  const full = (
    await Promise.all(shuffled.map((e) => getExercise(e.id)))
  ).filter((e): e is Exercise => e !== null)

  const session: CodingTestSession = {
    total: full,
    queue: full,
    correctCount: 0,
  }

  return NextResponse.json(session)
}

