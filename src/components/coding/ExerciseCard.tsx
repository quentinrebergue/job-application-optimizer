import Link from 'next/link'
import { DifficultyBadge } from './DifficultyBadge'
import type { ExerciseMeta, KnowledgeMeta } from '@/types'

interface Props {
  exercise: ExerciseMeta
  knowledgeMap: Record<string, KnowledgeMeta>
}

export function ExerciseCard({ exercise, knowledgeMap }: Props) {
  // Purple tags: knowledge_ids resolved to names, or fall back to category field
  const tags: string[] =
    exercise.knowledge_ids.length > 0
      ? exercise.knowledge_ids.map((kid) => knowledgeMap[kid]?.name ?? kid)
      : exercise.category
        ? [exercise.category]
        : []

  return (
    <Link
      href={`/coding/exercises/${exercise.id}`}
      className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col gap-3 hover:border-blue-300 hover:shadow-sm transition-all group"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-slate-900 leading-tight group-hover:text-blue-700 transition-colors">
          {exercise.title}
        </h3>
        <DifficultyBadge difficulty={exercise.difficulty} />
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((label) => (
            <span
              key={label}
              className="inline-flex items-center rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700"
            >
              {label}
            </span>
          ))}
        </div>
      )}

      {exercise.leetcode && (
        <p className="text-[11px] text-slate-400">LC #{exercise.leetcode}</p>
      )}
    </Link>
  )
}
