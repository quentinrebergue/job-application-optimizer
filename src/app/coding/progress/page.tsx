'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Download, Upload, Trash2, Plus } from 'lucide-react'
import { getAllExercises } from '@/lib/data'
import type { ExerciseMeta } from '@/types'

export default function ProgressPage() {
  const [allExercises, setAllExercises] = useState<ExerciseMeta[]>([])
  const [completed, setCompleted] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  // Load data
  useEffect(() => {
    (async () => {
      try {
        const [exercisesRes, progressRes] = await Promise.all([
          getAllExercises(),
          fetch('/api/coding/progress'),
        ])
        setAllExercises(exercisesRes)

        if (progressRes.ok) {
          const ids = (await progressRes.json()) as string[]
          setCompleted(new Set(ids))
        }
      } catch (err) {
        console.error('Failed to load data:', err)
      }
      setLoading(false)
    })()
  }, [])

  async function toggleExercise(id: string) {
    const next = new Set(completed)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }

    try {
      const res = await fetch('/api/coding/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(next) }),
      })
      if (res.ok) {
        setCompleted(next)
      }
    } catch (err) {
      console.error('Failed to update progress:', err)
    }
  }

  async function exportData() {
    const data = {
      exportDate: new Date().toISOString(),
      completedCount: completed.size,
      totalCount: allExercises.length,
      completedIds: Array.from(completed).sort(),
    }
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `coding-progress-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function importData(file: File) {
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)
        if (Array.isArray(data.completedIds)) {
          const res = await fetch('/api/coding/progress', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: data.completedIds }),
          })
          if (res.ok) {
            setCompleted(new Set(data.completedIds))
            alert('✓ Progress imported successfully!')
          } else {
            alert('Failed to save imported progress.')
          }
        } else {
          alert('Invalid file format. Expected completedIds array.')
        }
      } catch (err) {
        alert('Failed to import: ' + (err instanceof Error ? err.message : 'Unknown error'))
      }
    }
    reader.readAsText(file)
  }

  async function clearAll() {
    if (confirm('Clear all completed exercises? This cannot be undone.')) {
      try {
        const res = await fetch('/api/coding/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: [] }),
        })
        if (res.ok) {
          setCompleted(new Set())
        }
      } catch (err) {
        console.error('Failed to clear progress:', err)
      }
    }
  }

  if (loading) {
    return (
      <div className="p-4 md:p-8 max-w-2xl">
        <p className="text-slate-500">Loading progress...</p>
      </div>
    )
  }

  const completionRate = allExercises.length > 0
    ? Math.round((completed.size / allExercises.length) * 100)
    : 0

  // Group by stage/category
  const byStage = allExercises.reduce((acc, ex) => {
    const stage = ex.category || 'Other'
    if (!acc[stage]) acc[stage] = []
    acc[stage].push(ex)
    return acc
  }, {} as Record<string, ExerciseMeta[]>)

  const stageOrder = [
    'Prefix Sum', 'Two Pointers', 'Fast & Slow Pointers', 'Linked List Reversal',
    'Monotonic Stack', 'Top K/Heap', 'Sorting & Greedy', 'Intervals',
    'Binary Search', 'Backtracking', 'Binary Tree', 'DFS', 'BFS', 'Matrix',
    'Strings & DP', 'Dynamic Programming', 'Other'
  ]

  const stages = stageOrder.filter(s => byStage[s])

  return (
    <div className="p-4 md:p-8 max-w-2xl">
      {/* Back */}
      <Link
        href="/coding"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-6 transition-colors"
      >
        <ArrowLeft size={14} />
        Coding Trainer
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Your Progress</h1>
        <p className="text-slate-500">Track and manage your exercise completion</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Completed</p>
          <p className="text-3xl font-bold text-blue-600">{completed.size}</p>
          <p className="text-xs text-slate-500 mt-1">of {allExercises.length} exercises</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Progress</p>
          <p className="text-3xl font-bold text-emerald-600">{completionRate}%</p>
          <div className="h-2 bg-slate-200 rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 mb-8">
        <button
          onClick={exportData}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <Download size={14} />
          Export
        </button>
        <label className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer">
          <Upload size={14} />
          Import
          <input
            type="file"
            accept=".json"
            onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])}
            className="hidden"
          />
        </label>
        <button
          onClick={clearAll}
          disabled={completed.size === 0}
          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Trash2 size={14} />
          Clear All
        </button>
      </div>

      {/* Exercises by stage */}
      <div className="space-y-6">
        {stages.map((stage) => {
          const stageExercises = byStage[stage]!
          const stageCompleted = stageExercises.filter(e => completed.has(e.id)).length
          const stageRate = Math.round((stageCompleted / stageExercises.length) * 100)

          return (
            <div key={stage} className="rounded-xl border border-slate-200 bg-white p-4">
              {/* Stage header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-900">{stage}</h3>
                <span className="text-xs font-medium text-slate-500">
                  {stageCompleted}/{stageExercises.length} ({stageRate}%)
                </span>
              </div>

              {/* Stage progress bar */}
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-4">
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${stageRate}%` }}
                />
              </div>

              {/* Exercises */}
              <div className="space-y-2">
                {stageExercises.map((ex) => {
                  const isDone = completed.has(ex.id)
                  return (
                    <button
                      key={ex.id}
                      onClick={() => toggleExercise(ex.id)}
                      className={[
                        'w-full flex items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                        isDone
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
                      ].join(' ')}
                    >
                      <span className={['w-4 h-4 rounded border flex items-center justify-center text-xs font-bold shrink-0', isDone ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300'].join(' ')}>
                        {isDone ? '✓' : ''}
                      </span>
                      <span className="flex-1 truncate">{ex.title}</span>
                      {ex.leetcode && (
                        <span className="text-xs text-slate-400 shrink-0">LC#{ex.leetcode}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
