'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Check } from 'lucide-react'
import type { JobOffer, TestConfig, TestCard, TestSession, TestScope } from '@/types'
import { DEFAULT_QUESTION_COUNT } from '@/config'

const SESSION_KEY = 'qa_session'

const SCOPE_OPTIONS: { value: TestScope; label: string; description: string }[] = [
  { value: 'all',        label: 'All',          description: 'Every entity Q&A + all flashcards' },
  { value: 'job',        label: 'By job',        description: 'Job entities + taxonomy-matched flashcards' },
  { value: 'topics',     label: 'By topics',     description: 'Flashcards for selected topics only' },
  { value: 'job+topics', label: 'Job + topics',  description: 'Job entities + flashcards for selected topics' },
]

interface Props {
  jobs: JobOffer[]
}

export function SessionConfig({ jobs }: Props) {
  const router = useRouter()
  const [questionCount, setQuestionCount] = useState(DEFAULT_QUESTION_COUNT)
  const [scope, setScope] = useState<TestScope>('all')
  const [jobId, setJobId] = useState<string>(jobs[0]?.id ?? '')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      fetch('/api/questions')
        .then((r) => r.json())
        .then((qs: { tags: string[] }[]) => {
          const tags = [...new Set(qs.flatMap((q) => q.tags))].sort()
          setAvailableTags(tags)
        })
        .catch((err) => console.error('Failed to load questions:', err))
    } catch (err) {
      console.error('Error fetching questions:', err)
    }
  }, [])

  const needsJob = scope === 'job' || scope === 'job+topics'
  const needsTags = scope === 'topics' || scope === 'job+topics'

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  function isValid() {
    if (needsJob && !jobId) return false
    if (needsTags && selectedTags.length === 0) return false
    return true
  }

  async function start() {
    if (!isValid()) return
    const config: TestConfig = {
      questionCount,
      scope,
      jobId: needsJob ? jobId : undefined,
      tags: needsTags ? selectedTags : undefined,
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/qa/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })

      if (!res.ok) {
        setError('Failed to build session. Try again.')
        setLoading(false)
        return
      }

      const cards: TestCard[] = await res.json()

      if (cards.length === 0) {
        setError('No questions found for this configuration.')
        setLoading(false)
        return
      }

      const session: TestSession = {
        config,
        total: cards,
        queue: [...cards],
        correctCount: 0,
      }

      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
      router.push('/qa/test')
    } catch (err) {
      console.error('Session creation error:', err)
      setError('Error building session. Check console.')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        <p className="text-sm font-medium text-slate-700 mb-2">Number of questions</p>
        <div className="flex flex-wrap gap-2">
          {[5, 10, 20, 30, 50].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setQuestionCount(n)}
              className={[
                'rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
                questionCount === n
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-slate-300 text-slate-700 hover:bg-slate-50',
              ].join(' ')}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-slate-700 mb-2">Question pool</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {SCOPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setScope(opt.value)}
              disabled={opt.value !== 'all' && opt.value !== 'topics' && jobs.length === 0}
              className={[
                'text-left rounded-xl border-2 px-3 py-2.5 transition-all text-sm',
                scope === opt.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-200 bg-white hover:border-slate-300',
                (opt.value === 'job' || opt.value === 'job+topics') && jobs.length === 0
                  ? 'opacity-40 cursor-not-allowed'
                  : '',
              ].join(' ')}
            >
              <span className="block font-semibold text-slate-900 mb-0.5">{opt.label}</span>
              <span className="text-[11px] text-slate-500 leading-snug">{opt.description}</span>
            </button>
          ))}
        </div>
      </div>

      {needsJob && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Job</label>
          {jobs.length === 0 ? (
            <p className="text-sm text-slate-400">
              No jobs yet. <Link href="/jobs/new" className="text-blue-600 hover:underline">Add one</Link> first.
            </p>
          ) : (
            <select
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm w-full max-w-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.company} — {j.title}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {needsTags && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-slate-700">
              Topics
              {selectedTags.length > 0 && (
                <span className="ml-2 text-xs font-normal text-slate-400">
                  {selectedTags.length} selected
                </span>
              )}
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedTags([...availableTags])}
                className="text-xs text-blue-600 hover:text-blue-800 transition-colors px-2 py-1.5"
              >
                All topics
              </button>
              {selectedTags.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedTags([])}
                  className="text-xs text-slate-400 hover:text-slate-600 transition-colors px-2 py-1.5"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>

          {availableTags.length === 0 ? (
            <p className="text-sm text-slate-400">No topic tags found.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {availableTags.map((tag) => {
                const active = selectedTags.includes(tag)
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={[
                      'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-all',
                      active
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-slate-300 text-slate-600 hover:border-blue-300 hover:bg-blue-50',
                    ].join(' ')}
                  >
                    {active && <Check size={10} strokeWidth={3} />}
                    {tag}
                  </button>
                )
              })}
            </div>
          )}

          {needsTags && selectedTags.length === 0 && (
            <p className="mt-2 text-xs text-amber-600">Select at least one topic to continue.</p>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={start}
        disabled={loading || !isValid()}
        className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {loading ? 'Building session…' : 'Start Session →'}
      </button>
    </div>
  )
}

export { SESSION_KEY }
