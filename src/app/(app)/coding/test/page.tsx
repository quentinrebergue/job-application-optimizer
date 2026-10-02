'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Network } from 'lucide-react'
import { MarkdownContent } from '@/components/ui/MarkdownContent'
import { CODING_SESSION_KEY } from '@/components/coding/CodingSessionConfig'
import { DifficultyBadge } from '@/components/coding/DifficultyBadge'
import { PatternPicker } from '@/components/coding/PatternPicker'
import { DecisionTreeView } from '@/components/coding/DecisionTreeView'
import { FullDecisionTreeModal } from '@/components/coding/FullDecisionTreeModal'
import { getDecisionPath, type Pattern } from '@/config'
import type { CodingTestSession, Exercise } from '@/types'

export default function CodingTestPage() {
  const [session, setSession] = useState<CodingTestSession | null>(null)
  const [pickedPattern, setPickedPattern] = useState<Pattern | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [done, setDone] = useState(false)
  const [showFullTree, setShowFullTree] = useState(false)

  useEffect(() => {
    const raw = sessionStorage.getItem(CODING_SESSION_KEY)
    if (raw) {
      try {
        // sessionStorage is only available client-side, hence the effect;
        // this is a one-time mount hydration, not a render-loop risk.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSession(JSON.parse(raw) as CodingTestSession)
      } catch {
        // malformed — ignore
      }
    }
  }, [])

  function persist(updated: CodingTestSession) {
    setSession(updated)
    sessionStorage.setItem(CODING_SESSION_KEY, JSON.stringify(updated))
  }

  function handleReveal() {
    setRevealed(true)
  }

  function handlePick(pattern: Pattern) {
    setPickedPattern(pattern)
  }

  function handleGotIt() {
    if (!session) return
    const [, ...rest] = session.queue
    const updated: CodingTestSession = {
      ...session,
      queue: rest,
      correctCount: session.correctCount + 1,
    }
    setRevealed(false)
    setPickedPattern(null)
    setShowFullTree(false)
    if (rest.length === 0) {
      setDone(true)
    }
    persist(updated)
  }

  function handlePracticeMore() {
    if (!session) return
    const [current, ...rest] = session.queue
    const insertAt =
      rest.length > 1 ? Math.floor(Math.random() * (rest.length - 1)) + 1 : rest.length
    const newQueue: Exercise[] = [
      ...rest.slice(0, insertAt),
      current,
      ...rest.slice(insertAt),
    ]
    persist({ ...session, queue: newQueue })
    setRevealed(false)
    setPickedPattern(null)
    setShowFullTree(false)
  }

  // ─── No session ─────────────────────────────────────────────────────────────
  if (!session) {
    return (
      <div className="p-4 md:p-8 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <p className="text-slate-500 mb-4">No active session found.</p>
        <Link
          href="/coding"
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          Configure a Session
        </Link>
      </div>
    )
  }

  const progress = Math.round((session.correctCount / session.total.length) * 100)
  const current = session.queue[0]

  // ─── Done ────────────────────────────────────────────────────────────────────
  if (done || session.queue.length === 0) {
    return (
      <div className="p-4 md:p-8 flex flex-col items-center justify-center min-h-[60vh] text-center max-w-lg mx-auto">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Session Complete!</h2>
        <p className="text-slate-500 mb-6">
          You completed all <strong>{session.total.length}</strong> exercises.
        </p>
        <div className="flex gap-3">
          <Link
            href="/coding"
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            New Session
          </Link>
          <Link
            href="/"
            className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Dashboard
          </Link>
        </div>
      </div>
    )
  }

  // ─── Active session ──────────────────────────────────────────────────────────
  const fullTreePath = pickedPattern
    ? getDecisionPath((current.category as Pattern | undefined) ?? 'Other')
    : []

  return (
    <div className="p-4 md:p-8 flex flex-col items-center max-w-3xl mx-auto">
      {/* Header */}
      <div className="w-full flex items-center justify-between mb-6">
        <Link
          href="/coding"
          className="text-sm text-slate-500 hover:text-slate-900 transition-colors"
        >
          ← Exit
        </Link>
        <span className="text-sm text-slate-500">
          {session.correctCount} / {session.total.length} done&nbsp;·&nbsp;
          <span className="text-slate-700 font-medium">{session.queue.length} remaining</span>
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-slate-200 rounded-full mb-8 overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Exercise card */}
      <div className="w-full rounded-2xl border-2 border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Title + difficulty */}
        <div className="flex items-center justify-between gap-4 px-8 pt-8 pb-4">
          <h2 className="text-xl font-bold text-slate-900">{current.title}</h2>
          <DifficultyBadge difficulty={current.difficulty} />
        </div>

        {/* Problem description */}
        <div className="px-8 pb-8">
          <MarkdownContent>{current.description}</MarkdownContent>
        </div>

        {/* Pattern picker */}
        <div className="border-t-2 border-slate-200 px-8 py-6 flex flex-col gap-4">
          <PatternPicker
            picked={pickedPattern}
            correct={(current.category as Pattern | undefined) ?? 'Other'}
            onPick={handlePick}
          />
          <button
            type="button"
            onClick={() => setShowFullTree(true)}
            className="inline-flex items-center gap-1.5 self-start rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
          >
            <Network size={13} />
            Show Full Decision Tree
          </button>
        </div>
      </div>

      {/* Decision tree */}
      {pickedPattern && (
        <div className="w-full mt-6">
          <DecisionTreeView exercise={current} pickedPattern={pickedPattern} />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-center gap-3 mt-6">
        {pickedPattern && (
          <>
            {!revealed && (
              <button
                onClick={handleReveal}
                className="rounded-xl bg-slate-900 px-8 py-3 text-sm font-semibold text-white hover:bg-slate-700 transition-colors"
              >
                Show Solution
              </button>
            )}
            <button
              onClick={handlePracticeMore}
              className="rounded-xl border-2 border-orange-300 bg-orange-50 px-6 py-3 text-sm font-semibold text-orange-700 hover:bg-orange-100 transition-colors"
            >
              Practice More
            </button>
            <button
              onClick={handleGotIt}
              className="rounded-xl border-2 border-green-300 bg-green-50 px-6 py-3 text-sm font-semibold text-green-700 hover:bg-green-100 transition-colors"
            >
              Got It ✓
            </button>
          </>
        )}
      </div>

      {/* Solution (revealed) */}
      {revealed && (
        <div className="w-full mt-6 rounded-xl border border-slate-200 bg-slate-50 p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-4">
            Solution
          </p>
          <MarkdownContent className="mb-6">{current.solution.steps}</MarkdownContent>
          {current.solution.code && (
            <MarkdownContent>{`\`\`\`python\n${current.solution.code}\n\`\`\``}</MarkdownContent>
          )}
        </div>
      )}

      <FullDecisionTreeModal
        open={showFullTree}
        onClose={() => setShowFullTree(false)}
        pathNodeIds={pickedPattern ? new Set(fullTreePath.map((n) => n.id)) : undefined}
        leafNodeId={pickedPattern ? fullTreePath.at(-1)?.id : undefined}
      />
    </div>
  )
}
