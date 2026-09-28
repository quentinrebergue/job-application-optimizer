'use client'

import { PATTERNS, type Pattern } from '@/config'

interface Props {
  /** The pattern the user already picked for this exercise, if any */
  picked: Pattern | null
  /** The correct pattern, only used to color the picked button once an answer has been given */
  correct: Pattern
  onPick: (pattern: Pattern) => void
}

export function PatternPicker({ picked, correct, onPick }: Props) {
  return (
    <div className="w-full">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
        Which pattern applies here?
      </p>
      <div className="flex flex-wrap gap-2">
        {PATTERNS.map((pattern) => {
          const isPicked = picked === pattern
          const isCorrectPick = isPicked && pattern === correct
          const isWrongPick = isPicked && pattern !== correct
          return (
            <button
              key={pattern}
              type="button"
              disabled={picked !== null}
              onClick={() => onPick(pattern)}
              className={[
                'rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors',
                isCorrectPick
                  ? 'border-green-300 bg-green-50 text-green-700'
                  : isWrongPick
                    ? 'border-red-300 bg-red-50 text-red-700'
                    : picked !== null
                      ? 'border-slate-200 text-slate-400 cursor-not-allowed'
                      : 'border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-50 cursor-pointer',
              ].join(' ')}
            >
              {pattern}
            </button>
          )
        })}
      </div>
    </div>
  )
}
