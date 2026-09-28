'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { CodingTestSession, Difficulty } from '@/types'

export const CODING_SESSION_KEY = 'coding_session'

const COUNTS = [5, 10, 20]
const DIFFICULTIES = ['all', 'easy', 'medium', 'hard'] as const
type DifficultyFilter = (typeof DIFFICULTIES)[number]

interface Props {
  totalCount: number
}

export function CodingSessionConfig({ totalCount }: Props) {
  const router = useRouter()
  const [difficulty, setDifficulty] = useState<DifficultyFilter>('all')
  const [countSelection, setCountSelection] = useState<number | 'all'>(10)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const count = countSelection === 'all' ? totalCount : countSelection

  async function handleStart() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/coding/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          difficulty: difficulty === 'all' ? undefined : (difficulty as Difficulty),
          count,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error ?? 'Failed to start session')
      }
      const session: CodingTestSession = await res.json()
      if (session.total.length === 0) {
        setError('No exercises match your filter. Add some first.')
        return
      }
      sessionStorage.setItem(CODING_SESSION_KEY, JSON.stringify(session))
      router.push('/coding/test')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 flex flex-col gap-6">
      <h2 className="font-semibold text-slate-900 text-lg">Start a Practice Session</h2>

      {/* Difficulty filter */}
      <div>
        <p className="text-sm font-medium text-slate-700 mb-2">Difficulty</p>
        <div className="flex flex-wrap gap-2">
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors border ${
                difficulty === d
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
              }`}
            >
              {d === 'all' ? 'All' : d.charAt(0).toUpperCase() + d.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Count */}
      <div>
        <p className="text-sm font-medium text-slate-700 mb-2">
          Number of exercises{' '}
          <span className="text-slate-400 font-normal">({totalCount} available)</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {COUNTS.map((n) => (
            <button
              key={n}
              onClick={() => setCountSelection(n)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors border ${
                countSelection === n
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
              }`}
            >
              {n}
            </button>
          ))}
          <button
            onClick={() => setCountSelection('all')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors border ${
              countSelection === 'all'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
            }`}
          >
            All
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        onClick={handleStart}
        disabled={loading}
        className="self-start rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
      >
        {loading ? 'Loading…' : 'Start Session →'}
      </button>
    </div>
  )
}
