'use client'

import type { TestCard } from '@/types'
import { Badge } from '@/components/ui/Badge'
import { MarkdownContent } from '@/components/ui/MarkdownContent'

interface Props {
  card: TestCard
  revealed: boolean
  onReveal: () => void
  onGotIt: () => void
  onPracticeMore: () => void
}

export function FlashCard({ card, revealed, onReveal, onGotIt, onPracticeMore }: Props) {
  return (
    <div className="w-full max-w-2xl">
      {/* Source badge */}
      <div className="flex justify-center mb-4">
        <Badge label={card.source} variant="blue" />
      </div>

      {/* Card */}
      <div className="rounded-2xl border-2 border-slate-200 bg-white shadow-sm min-h-52 flex flex-col">
        {/* Question */}
        <div className="flex-1 p-8 flex items-center justify-center">
          <div className="w-full">
            <MarkdownContent className="prose-question">
              {card.question}
            </MarkdownContent>
          </div>
        </div>

        {/* Divider + answer */}
        {revealed && (
          <>
            <div className="border-t border-slate-200" />
            <div className="p-8 bg-slate-50 rounded-b-2xl">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">Answer</p>
              <MarkdownContent>{card.answer}</MarkdownContent>
            </div>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-center gap-3 mt-6">
        {!revealed ? (
          <button
            onClick={onReveal}
            className="rounded-xl bg-slate-900 px-8 py-3 text-sm font-semibold text-white hover:bg-slate-700 transition-colors"
          >
            Show Answer
          </button>
        ) : (
          <>
            <button
              onClick={onPracticeMore}
              className="rounded-xl border-2 border-orange-300 bg-orange-50 px-6 py-3 text-sm font-semibold text-orange-700 hover:bg-orange-100 transition-colors"
            >
              Practice More
            </button>
            <button
              onClick={onGotIt}
              className="rounded-xl border-2 border-emerald-400 bg-emerald-50 px-6 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
            >
              Got It ✓
            </button>
          </>
        )}
      </div>
    </div>
  )
}
