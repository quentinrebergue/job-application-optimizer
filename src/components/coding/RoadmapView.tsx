'use client'

import { useState, useEffect, useCallback } from 'react'
import { CheckCircle2, Circle } from 'lucide-react'
import type { ExerciseMeta } from '@/types'

interface Stage {
  id: string
  label: string
  headerBg: string
  exerciseIds: string[]
}

const STAGES: Stage[] = [
  {
    id: 's1', label: 'Foundations',
    headerBg: 'bg-blue-500',
    exerciseIds: ['ex-001', 'ex-004', 'ex-024', 'ex-020'],
  },
  {
    id: 's2', label: 'Prefix Sum',
    headerBg: 'bg-sky-500',
    exerciseIds: ['ex-049', 'ex-050', 'ex-051'],
  },
  {
    id: 's3', label: 'Two Pointers',
    headerBg: 'bg-cyan-500',
    exerciseIds: ['ex-052', 'ex-053', 'ex-054'],
  },
  {
    id: 's4', label: 'Sliding Window',
    headerBg: 'bg-teal-500',
    exerciseIds: [
      'ex-035', 'ex-002', 'ex-003', 'ex-038',
      'ex-034', 'ex-039', 'ex-040', 'ex-042',
      'ex-036', 'ex-037', 'ex-043', 'ex-033',
      'ex-022', 'ex-021',
    ],
  },
  {
    id: 's5', label: 'Fast & Slow Ptrs',
    headerBg: 'bg-emerald-500',
    exerciseIds: ['ex-055', 'ex-056', 'ex-057'],
  },
  {
    id: 's6', label: 'Linked Lists',
    headerBg: 'bg-rose-500',
    exerciseIds: ['ex-058', 'ex-059', 'ex-060', 'ex-016', 'ex-023', 'ex-017', 'ex-018'],
  },
  {
    id: 's7', label: 'Monotonic Stack',
    headerBg: 'bg-orange-500',
    exerciseIds: ['ex-061', 'ex-062', 'ex-063'],
  },
  {
    id: 's8', label: 'Top K / Heap',
    headerBg: 'bg-amber-500',
    exerciseIds: ['ex-064', 'ex-065', 'ex-066'],
  },
  {
    id: 's9', label: 'Sorting & Greedy',
    headerBg: 'bg-violet-500',
    exerciseIds: ['ex-044', 'ex-045', 'ex-046', 'ex-047', 'ex-005', 'ex-015', 'ex-026', 'ex-028'],
  },
  {
    id: 's10', label: 'Intervals',
    headerBg: 'bg-pink-500',
    exerciseIds: ['ex-005', 'ex-067', 'ex-048'],
  },
  {
    id: 's11', label: 'Binary Search',
    headerBg: 'bg-yellow-500',
    exerciseIds: ['ex-006', 'ex-041', 'ex-013', 'ex-025', 'ex-030', 'ex-068', 'ex-069'],
  },
  {
    id: 's12', label: 'Backtracking',
    headerBg: 'bg-fuchsia-500',
    exerciseIds: ['ex-019', 'ex-082', 'ex-083'],
  },
  {
    id: 's13', label: 'Binary Tree',
    headerBg: 'bg-lime-500',
    exerciseIds: ['ex-070', 'ex-071', 'ex-072', 'ex-073'],
  },
  {
    id: 's14', label: 'DFS',
    headerBg: 'bg-green-600',
    exerciseIds: ['ex-074', 'ex-075', 'ex-076'],
  },
  {
    id: 's15', label: 'BFS',
    headerBg: 'bg-blue-600',
    exerciseIds: ['ex-077', 'ex-078', 'ex-079'],
  },
  {
    id: 's16', label: 'Matrix',
    headerBg: 'bg-indigo-500',
    exerciseIds: ['ex-007', 'ex-029', 'ex-031', 'ex-080', 'ex-081'],
  },
  {
    id: 's17', label: 'Strings & DP',
    headerBg: 'bg-purple-500',
    exerciseIds: ['ex-014', 'ex-027', 'ex-032'],
  },
  {
    id: 's18', label: 'Dynamic Prog.',
    headerBg: 'bg-purple-700',
    exerciseIds: ['ex-084', 'ex-085', 'ex-086', 'ex-087', 'ex-088'],
  },
  {
    id: 's19', label: 'Design',
    headerBg: 'bg-slate-500',
    exerciseIds: ['ex-008'],
  },
  {
    id: 's20', label: 'ML & Systems',
    headerBg: 'bg-slate-700',
    exerciseIds: ['ex-009', 'ex-010', 'ex-011', 'ex-012'],
  },
]

const DIFF_DOT: Record<string, string> = {
  easy:   'bg-emerald-400',
  medium: 'bg-amber-400',
  hard:   'bg-red-400',
}

interface Props {
  exercises: ExerciseMeta[]
}

export function RoadmapView({ exercises }: Props) {
  const [completed, setCompleted] = useState<Set<string>>(new Set())
  const [mounted, setMounted] = useState(false)
  const [saving, setSaving] = useState(false)

  const exMap = Object.fromEntries(exercises.map((e) => [e.id, e]))

  useEffect(() => {
    setMounted(true)
    ;(async () => {
      try {
        const res = await fetch('/api/coding/progress')
        if (res.ok) {
          const ids: string[] = await res.json()
          setCompleted(new Set(ids))
        }
      } catch (err) {
        console.error('Failed to load progress:', err)
      }
    })()
  }, [])

  const toggle = useCallback((id: string) => {
    setCompleted((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)

      setSaving(true)
      fetch('/api/coding/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(next) }),
      })
        .then((res) => res.ok && setCompleted(next))
        .catch((err) => console.error('Failed to save progress:', err))
        .finally(() => setSaving(false))

      return next
    })
  }, [])

  const totalCount = exercises.length
  const doneCount = completed.size
  const progress = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0

  return (
    <div>
      {/* Overall progress bar */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-sm font-semibold text-slate-600 tabular-nums whitespace-nowrap">
          {doneCount} / {totalCount}
        </span>
        <span className="text-sm text-slate-400">{progress}%</span>
      </div>

      {/* Roadmap — horizontal scroll */}
      <div className="overflow-x-auto pb-4 -mx-1 px-1">
        <div className="flex items-start gap-0 min-w-max">
          {STAGES.map((stage, stageIdx) => {
            const stageExercises = stage.exerciseIds
              .map((id) => exMap[id])
              .filter(Boolean)
            // dedupe (ex-005 appears in two stages)
            const seen = new Set<string>()
            const unique = stageExercises.filter((e) => {
              if (seen.has(e.id)) return false
              seen.add(e.id); return true
            })
            const stageDone = unique.filter((e) => completed.has(e.id)).length
            const allDone = stageDone === unique.length && unique.length > 0

            return (
              <div key={stage.id} className="flex items-start">
                {/* Stage card */}
                <div className="w-48 rounded-xl overflow-hidden shadow-sm border border-slate-200">
                  {/* Header */}
                  <div className={`${stage.headerBg} px-3 py-2.5 flex items-center justify-between gap-2`}>
                    <span className="text-white text-xs font-semibold leading-tight">{stage.label}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${allDone ? 'bg-white/30 text-white' : 'bg-black/20 text-white/80'}`}>
                      {stageDone}/{unique.length}
                    </span>
                  </div>

                  {/* Exercise nodes */}
                  <div className="bg-white divide-y divide-slate-100">
                    {unique.map((ex) => {
                      const done = mounted && completed.has(ex.id)
                      return (
                        <button
                          key={ex.id}
                          onClick={() => toggle(ex.id)}
                          className={`w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors group
                            ${done ? 'bg-emerald-50 hover:bg-emerald-100' : 'hover:bg-slate-50'}`}
                        >
                          {done
                            ? <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                            : <Circle size={14} className="text-slate-300 group-hover:text-slate-400 shrink-0 transition-colors" />
                          }
                          <span className={`text-[11px] leading-snug flex-1 min-w-0 truncate
                            ${done ? 'text-emerald-700' : 'text-slate-700'}`}>
                            {ex.title}
                          </span>
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${DIFF_DOT[ex.difficulty]}`} />
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Arrow connector */}
                {stageIdx < STAGES.length - 1 && (
                  <div className="flex items-center self-stretch px-1" style={{ paddingTop: '18px' }}>
                    <svg width="20" height="12" viewBox="0 0 20 12" fill="none" className="shrink-0">
                      <line x1="0" y1="6" x2="14" y2="6" stroke="#cbd5e1" strokeWidth="1.5" />
                      <path d="M12 2L18 6L12 10" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    </svg>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 text-xs text-slate-400">
        <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Easy</span>
        <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Medium</span>
        <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-red-400" /> Hard</span>
        <span className="ml-2">· Click any exercise to toggle completion</span>
      </div>
    </div>
  )
}
