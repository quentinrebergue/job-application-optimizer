import Link from 'next/link'
import { listExercises, listKnowledge, getKnowledge } from '@/lib/data'
import { PageHeader } from '@/components/ui/PageHeader'
import { ExerciseCard } from '@/components/coding/ExerciseCard'
import { KnowledgeCard } from '@/components/coding/KnowledgeCard'
import { CodingSessionConfig } from '@/components/coding/CodingSessionConfig'
import { RoadmapView } from '@/components/coding/RoadmapView'
import type { KnowledgeMeta } from '@/types'
import { verifySession } from '@/lib/auth/dal'

export const dynamic = 'force-dynamic'

export default async function CodingPage() {
  const { userId } = await verifySession()
  const [exercises, knowledgeMetas] = await Promise.all([listExercises(userId), listKnowledge(userId)])

  // Load full knowledge items (explanation included) for KnowledgeCard expand
  const knowledgeItems = (
    await Promise.all(knowledgeMetas.map((k) => getKnowledge(userId, k.id)))
  ).filter((k) => k !== null)

  // Build id → meta map for ExerciseCard tag labels
  const knowledgeMap: Record<string, KnowledgeMeta> = Object.fromEntries(
    knowledgeMetas.map((k) => [k.id, k])
  )

  return (
    <div className="p-4 md:p-8 flex flex-col gap-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <PageHeader
          title="Coding Trainer"
          subtitle="Practice algorithmic exercises with spaced repetition."
        />
        <Link
          href="/coding/progress"
          className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors shrink-0"
        >
          View Progress
        </Link>
      </div>

      {/* Session config */}
      <CodingSessionConfig totalCount={exercises.length} />

      {/* Roadmap */}
      <section>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Roadmap</h2>
        <RoadmapView exercises={exercises} />
      </section>

      {/* Exercise bank */}
      <section>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Exercise Bank{' '}
          <span className="text-sm font-normal text-slate-500">({exercises.length})</span>
        </h2>
        {exercises.length === 0 ? (
          <p className="text-sm text-slate-400">No exercises yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {exercises.map((ex) => (
              <ExerciseCard key={ex.id} exercise={ex} knowledgeMap={knowledgeMap} />
            ))}
          </div>
        )}
      </section>

      {/* Knowledge bank */}
      <section>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Knowledge Bank{' '}
          <span className="text-sm font-normal text-slate-500">({knowledgeItems.length})</span>
        </h2>
        {knowledgeItems.length === 0 ? (
          <p className="text-sm text-slate-400">No knowledge entries yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {knowledgeItems.map((item) => (
              <KnowledgeCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
