'use client'

import { CheckCircle2, ChevronDown, XCircle } from 'lucide-react'
import { getChildren, getDecisionPath, getRuledOutAlternatives, type Pattern } from '@/config'
import type { Exercise } from '@/types'

interface Props {
  exercise: Exercise
  pickedPattern: Pattern
}

export function DecisionTreeView({ exercise, pickedPattern }: Props) {
  const correctPattern = (exercise.category as Pattern | undefined) ?? 'Other'
  const path = getDecisionPath(correctPattern)
  const isCorrect = pickedPattern === correctPattern
  const alternatives = getRuledOutAlternatives(correctPattern)

  if (path.length === 0) return null

  // One step per branching node on the path: the question asked there, and
  // its children with the one that continues the path highlighted. Children
  // of untaken siblings are never shown — we only ever descend into the
  // branch actually taken, and only the question actually asked is shown.
  const steps = path.slice(0, -1).map((node, i) => ({
    parentId: node.id,
    question: node.question,
    children: getChildren(node.id),
    takenId: path[i + 1].id,
  }))

  return (
    <div className="w-full rounded-xl border border-slate-200 bg-white p-6 flex flex-col gap-4">
      <div
        className={[
          'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium',
          isCorrect ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700',
        ].join(' ')}
      >
        {isCorrect ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
        {isCorrect
          ? `Correct — this is a "${correctPattern}" problem.`
          : `You picked "${pickedPattern}". The right pattern is "${correctPattern}".`}
      </div>

      {/* Visual tree — orange squares = questions actually asked, grey squares =
          answers not taken, green squares = answers taken. Only the taken
          node's children (and its question) are ever shown on the next step. */}
      <div className="rounded-lg bg-slate-50 p-4 flex flex-col items-center gap-1.5">
        {steps.map((step, i) => (
          <div key={step.parentId} className="flex flex-col items-center gap-1.5 w-full">
            {step.question && (
              <>
                <div className="max-w-64 border border-orange-300 bg-orange-50 px-2.5 py-1.5 text-center text-[11px] leading-snug font-semibold text-orange-700">
                  {step.question}
                </div>
                <ChevronDown size={14} className="text-slate-300 shrink-0" />
              </>
            )}

            <div className="flex w-full items-start justify-center gap-1.5">
              {step.children.map((child) => {
                const taken = child.id === step.takenId
                const isFinalLeaf = taken && i === steps.length - 1 && !!child.pattern
                return (
                  <div
                    key={child.id}
                    className={[
                      'min-w-0 max-w-52 flex-1 border px-2 py-1 text-center text-[11px] leading-snug',
                      isFinalLeaf
                        ? 'border-green-600 bg-green-600 font-bold text-white'
                        : taken
                          ? 'border-green-400 bg-green-100 font-semibold text-green-800'
                          : 'border-slate-200 bg-white text-slate-400',
                    ].join(' ')}
                  >
                    {child.pattern ? (
                      <>
                        {child.answer && (
                          <div className="mb-1 font-normal opacity-80">{child.answer}</div>
                        )}
                        <div className="font-bold">{child.pattern}</div>
                      </>
                    ) : (
                      child.answer ?? child.id
                    )}
                  </div>
                )
              })}
            </div>

            {i < steps.length - 1 && <ChevronDown size={14} className="text-slate-300 shrink-0" />}
          </div>
        ))}
      </div>

      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Decision Path</p>

      <div className="flex flex-col">
        {path.map((node) => {
          const justification = exercise.patternJustifications?.[node.id] ?? node.justification
          const isLeaf = !!node.pattern
          return (
            <div key={node.id}>
              {node.answer && (
                <div className="border-l-2 border-blue-200 pl-3 mb-3">
                  <p
                    className={[
                      'text-sm font-semibold',
                      isLeaf ? 'text-blue-700' : 'text-slate-700',
                    ].join(' ')}
                  >
                    → {node.answer}
                  </p>
                  {justification && <p className="text-sm text-slate-500 mt-0.5">{justification}</p>}
                </div>
              )}
              {node.question && (
                <p className="text-sm font-semibold text-slate-900 mb-1.5">{node.question}</p>
              )}
            </div>
          )
        })}
      </div>

      {alternatives.length > 0 && (
        <div className="border-t border-slate-100 pt-4 flex flex-col gap-2.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Ruled Out Here
          </p>
          {alternatives.map((node) => {
            const justification = exercise.patternJustifications?.[node.id] ?? node.justification
            return (
              <div key={node.id} className="border-l-2 border-slate-200 pl-3">
                <p className="text-sm font-semibold text-slate-500">✗ {node.pattern}</p>
                {justification && <p className="text-sm text-slate-400 mt-0.5">{justification}</p>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
