import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { listEntities, getEntity, listGeneralQuestions, getResumeConfig, getJob, getJobQuestions, getTaxonomy, tagsOverlap } from '@/lib/data'
import { ENTITY_TYPE_IDS } from '@/config'
import type { Entity, TestCard, TestConfig } from '@/types'
import { getSessionUserId } from '@/lib/auth/session'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const JOB_SCOPES = new Set(['job', 'job+topics'])
const TOPIC_SCOPES = new Set(['topics', 'job+topics'])

export async function POST(request: Request) {
  const userId = await getSessionUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const config = (await request.json()) as TestConfig

    // ── 1. Entity cards (skipped for topics-only scope) ─────────────────────
    const entityCards: TestCard[] = []

    if (!TOPIC_SCOPES.has(config.scope) || config.scope === 'job+topics') {
      // include entity Q&A for 'all', 'job', 'job+topics'
      let allowedEntityIds: string[] | null = null

      if (JOB_SCOPES.has(config.scope) && config.jobId) {
        const resumeConfig = await getResumeConfig(userId, config.jobId)
        allowedEntityIds = resumeConfig.selected_entity_ids
      }

      const allMetas = (
        await Promise.all(ENTITY_TYPE_IDS.map((t) => listEntities(userId, t)))
      ).flat()

      const filteredMetas = allowedEntityIds
        ? allMetas.filter((e) => allowedEntityIds!.includes(e.id))
        : allMetas

      const entities: (Entity | null)[] = await Promise.all(
        filteredMetas.map((e) => getEntity(userId, e.type, e.id))
      )

      for (const entity of entities) {
        if (!entity) continue
        const sourceName =
          entity.type === 'skills' ? entity.name
          : entity.type === 'education' ? entity.degree
          : entity.title
        for (const q of entity.questions) {
          entityCards.push({ id: uuidv4(), question: q.question, answer: q.answer, source: sourceName })
        }
      }
    }

    // ── 2. General flashcards with scope-aware filtering ─────────────────────
    let generalQuestions = await listGeneralQuestions(userId)

    if (TOPIC_SCOPES.has(config.scope) && config.tags && config.tags.length > 0) {
      // explicit tag filter for 'topics' and 'job+topics'
      const selected = new Set(config.tags)
      const matched = generalQuestions.filter((q) => q.tags.some((t) => selected.has(t)))
      if (matched.length > 0) generalQuestions = matched
    } else if (config.scope === 'job' && config.jobId) {
      // taxonomy-based auto-filter for pure 'job' scope
      const job = await getJob(userId, config.jobId)
      if (job && job.tags.length > 0) {
        const { nodes } = await getTaxonomy(userId)
        const matched = generalQuestions.filter(
          (q) => q.tags.length > 0 && tagsOverlap(q.tags, job.tags, nodes)
        )
        if (matched.length > 0) generalQuestions = matched
      }
    }
    // 'all' scope: no filtering — keep all general questions

    const generalCards: TestCard[] = generalQuestions.map((q) => ({
      id: uuidv4(),
      question: q.question,
      answer: q.answer,
      source: q.tags.length > 0 ? q.tags[0] : 'General',
    }))

    // ── 3. Job-specific custom questions ─────────────────────────────────────
    const jobCards: TestCard[] = []
    if (JOB_SCOPES.has(config.scope) && config.jobId) {
      const job = await getJob(userId, config.jobId)
      const jobQuestions = await getJobQuestions(userId, config.jobId)
      const source = job ? job.company : 'Job'
      for (const q of jobQuestions) {
        jobCards.push({ id: uuidv4(), question: q.question, answer: q.answer, source })
      }
    }

    // ── 4. Combine, shuffle, limit ────────────────────────────────────────────
    const all = shuffle([...entityCards, ...generalCards, ...jobCards])
    const cards = all.slice(0, config.questionCount)

    return NextResponse.json(cards)
  } catch {
    return NextResponse.json({ error: 'Failed to build session' }, { status: 500 })
  }
}
