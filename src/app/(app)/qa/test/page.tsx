'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FlashCard } from '@/components/qa/FlashCard'
import { SESSION_KEY } from '@/components/qa/SessionConfig'
import type { TestCard, TestSession } from '@/types'

export default function QATestPage() {
  const [session, setSession] = useState<TestSession | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (raw) {
      try {
        // sessionStorage is only available client-side, hence the effect;
        // this is a one-time mount hydration, not a render-loop risk.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSession(JSON.parse(raw) as TestSession)
      } catch {
        // malformed — ignore
      }
    }
  }, [])

  function persist(updated: TestSession) {
    setSession(updated)
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(updated))
  }

  function handleReveal() {
    setRevealed(true)
  }

  function handleGotIt() {
    if (!session) return
    const [, ...rest] = session.queue
    const updated: TestSession = { ...session, queue: rest, correctCount: session.correctCount + 1 }
    setRevealed(false)
    if (rest.length === 0) {
      setDone(true)
      persist(updated)
    } else {
      persist(updated)
    }
  }

  function handlePracticeMore() {
    if (!session) return
    // Move current card to a random position in the remaining queue (not first)
    const [current, ...rest] = session.queue
    const insertAt = rest.length > 1 ? Math.floor(Math.random() * (rest.length - 1)) + 1 : rest.length
    const newQueue: TestCard[] = [...rest.slice(0, insertAt), current, ...rest.slice(insertAt)]
    persist({ ...session, queue: newQueue })
    setRevealed(false)
  }

  // ─── No session ─────────────────────────────────────────────────────────────
  if (!session) {
    return (
      <div className="p-4 md:p-8 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <p className="text-slate-500 mb-4">No active session found.</p>
        <Link
          href="/qa"
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
          You answered all <strong>{session.total.length}</strong> questions.
        </p>
        <div className="flex gap-3">
          <Link
            href="/qa"
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
  return (
    <div className="p-4 md:p-8 flex flex-col items-center max-w-3xl mx-auto">
      {/* Header */}
      <div className="w-full flex items-center justify-between mb-6">
        <Link href="/qa" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">
          ← Exit
        </Link>
        <span className="text-sm text-slate-500">
          {session.correctCount} / {session.total.length} done
          &nbsp;·&nbsp;
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

      {/* Card */}
      <FlashCard
        card={current}
        revealed={revealed}
        onReveal={handleReveal}
        onGotIt={handleGotIt}
        onPracticeMore={handlePracticeMore}
      />
    </div>
  )
}
