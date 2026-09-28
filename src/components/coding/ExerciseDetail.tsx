'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Circle, ExternalLink } from 'lucide-react'
import { DifficultyBadge } from './DifficultyBadge'
import { MarkdownContent } from '@/components/ui/MarkdownContent'
import type { Exercise } from '@/types'

interface Props {
  exercise: Exercise
}

export function ExerciseDetail({ exercise }: Props) {
  const [revealed, setRevealed] = useState(false)
  const [done, setDone] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/coding/progress')
        if (res.ok) {
          const ids: string[] = await res.json()
          setDone(ids.includes(exercise.id))
        }
      } catch (err) {
        console.error('Failed to load progress:', err)
      }
    })()
  }, [exercise.id])

  async function toggleDone() {
    setSaving(true)
    try {
      const res = await fetch('/api/coding/progress')
      const ids: string[] = res.ok ? await res.json() : []
      const next = done
        ? ids.filter((id) => id !== exercise.id)
        : [...ids, exercise.id]

      const saveRes = await fetch('/api/coding/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: next }),
      })

      if (saveRes.ok) {
        setDone(!done)
      }
    } catch (err) {
      console.error('Failed to update progress:', err)
    }
    setSaving(false)
  }

  const categoryLabel = exercise.category
    ?? (exercise.knowledge_ids.length > 0 ? null : null)

  return (
    <div className="flex flex-col gap-6">
      {/* Back */}
      <Link
        href="/coding"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft size={14} />
        Coding Trainer
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-slate-900">{exercise.title}</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <DifficultyBadge difficulty={exercise.difficulty} />
            {categoryLabel && (
              <span className="inline-flex items-center rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-medium text-purple-700">
                {categoryLabel}
              </span>
            )}
            {exercise.knowledge_ids.map((kid) => (
              <span key={kid} className="inline-flex items-center rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-medium text-purple-700">
                {kid}
              </span>
            ))}
            {exercise.leetcode && (
              <a
                href={`https://leetcode.com/problems/`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-600 hover:bg-orange-100 transition-colors"
              >
                LC #{exercise.leetcode}
                <ExternalLink size={10} />
              </a>
            )}
          </div>
        </div>

        {/* Mark complete */}
        <button
          onClick={toggleDone}
          disabled={saving}
          className={[
            'flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors shrink-0',
            done
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              : 'border-slate-300 text-slate-600 hover:bg-slate-50',
            saving ? 'opacity-50 cursor-not-allowed' : '',
          ].join(' ')}
        >
          {done
            ? <CheckCircle2 size={15} className="text-emerald-500" />
            : <Circle size={15} className="text-slate-400" />}
          {saving ? 'Saving…' : done ? 'Done' : 'Mark done'}
        </button>
      </div>

      {/* Problem */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-4">Problem</p>
        <MarkdownContent>{exercise.description}</MarkdownContent>
      </div>

      {/* Solution */}
      {!revealed ? (
        <button
          onClick={() => setRevealed(true)}
          className="self-start rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-700 transition-colors"
        >
          Show Solution
        </button>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 flex flex-col gap-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Solution</p>
          <MarkdownContent>{exercise.solution.steps}</MarkdownContent>
          {exercise.solution.code && (
            <MarkdownContent>{`\`\`\`python\n${exercise.solution.code}\n\`\`\``}</MarkdownContent>
          )}
        </div>
      )}
    </div>
  )
}
