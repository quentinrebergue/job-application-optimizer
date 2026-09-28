'use client'

import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { EntityQuestion } from '@/types'
import { MarkdownContent } from '@/components/ui/MarkdownContent'

interface Props {
  questions: EntityQuestion[]
  onChange: (questions: EntityQuestion[]) => void
  saving?: boolean
}

export function QuestionEditor({ questions, onChange, saving }: Props) {
  const [newQ, setNewQ] = useState('')
  const [newA, setNewA] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editQ, setEditQ] = useState('')
  const [editA, setEditA] = useState('')

  function addQuestion() {
    if (!newQ.trim() || !newA.trim()) return
    onChange([...questions, { id: uuidv4(), question: newQ.trim(), answer: newA.trim() }])
    setNewQ('')
    setNewA('')
  }

  function deleteQuestion(id: string) {
    onChange(questions.filter((q) => q.id !== id))
  }

  function startEdit(q: EntityQuestion) {
    setEditId(q.id)
    setEditQ(q.question)
    setEditA(q.answer)
  }

  function saveEdit() {
    onChange(questions.map((q) => q.id === editId ? { ...q, question: editQ.trim(), answer: editA.trim() } : q))
    setEditId(null)
  }

  return (
    <div className="space-y-4">
      {/* Existing questions */}
      {questions.length === 0 && (
        <p className="text-sm text-slate-400 italic">No questions yet. Add one below.</p>
      )}
      <div className="space-y-3">
        {questions.map((q) => (
          <div key={q.id} className="rounded-lg border border-slate-200 bg-white p-4">
            {editId === q.id ? (
              <div className="space-y-2">
                <textarea
                  value={editQ}
                  onChange={(e) => setEditQ(e.target.value)}
                  rows={2}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Question"
                />
                <textarea
                  value={editA}
                  onChange={(e) => setEditA(e.target.value)}
                  rows={3}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Answer"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={saveEdit}
                    onTouchEnd={(e) => { e.preventDefault(); saveEdit() }}
                    className="touch-target rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditId(null)}
                    onTouchEnd={(e) => { e.preventDefault(); setEditId(null) }}
                    className="touch-target rounded border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Question</p>
                <MarkdownContent className="mb-3">{q.question}</MarkdownContent>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Answer</p>
                <MarkdownContent>{q.answer}</MarkdownContent>
                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => startEdit(q)}
                    onTouchEnd={(e) => { e.preventDefault(); startEdit(q) }}
                    className="touch-target px-3 py-1.5 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteQuestion(q.id)}
                    onTouchEnd={(e) => { e.preventDefault(); deleteQuestion(q.id) }}
                    className="touch-target px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 rounded transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add new question */}
      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 space-y-2">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Add Question</p>
        <textarea
          value={newQ}
          onChange={(e) => setNewQ(e.target.value)}
          rows={2}
          placeholder="Question"
          className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
        <textarea
          value={newA}
          onChange={(e) => setNewA(e.target.value)}
          rows={3}
          placeholder="Answer"
          className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
        <button
          type="button"
          onClick={addQuestion}
          onTouchEnd={(e) => { e.preventDefault(); addQuestion() }}
          disabled={saving || !newQ.trim() || !newA.trim()}
          className="rounded bg-slate-800 px-4 py-1.5 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-40 transition-colors"
        >
          Add
        </button>
      </div>
    </div>
  )
}
