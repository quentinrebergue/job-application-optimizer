'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import type { GeneralQuestion } from '@/types'
import { MarkdownContent } from '@/components/ui/MarkdownContent'

const ALL_TAG = '__all__'

export function GeneralQAManager() {
  const [questions, setQuestions] = useState<GeneralQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTag, setActiveTag] = useState<string>(ALL_TAG)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ question: '', answer: '', tags: '' })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/questions')
      if (res.ok) setQuestions(await res.json())
    } catch (err) {
      console.error('Failed to load questions:', err)
    }
    setLoading(false)
  }, [])

  // `load` is async; its setState calls happen after the awaited fetch,
  // not synchronously within this effect.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [load])

  const allTags = [...new Set(questions.flatMap((q) => q.tags))].sort()
  const filtered = activeTag === ALL_TAG ? questions : questions.filter((q) => q.tags.includes(activeTag))

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this flashcard?')) return
    try {
      await fetch(`/api/questions/${id}`, { method: 'DELETE' })
      setQuestions((prev) => prev.filter((q) => q.id !== id))
    } catch (err) {
      console.error('Failed to delete:', err)
    }
  }

  async function handleAdd() {
    if (!form.question.trim() || !form.answer.trim()) return
    setSaving(true)
    try {
      const tags = form.tags.split(',').map((t) => t.trim()).filter(Boolean)
      const res = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: form.question, answer: form.answer, tags }),
      })
      if (res.ok) {
        const q: GeneralQuestion = await res.json()
        setQuestions((prev) => [...prev, q])
        setForm({ question: '', answer: '', tags: '' })
        setShowForm(false)
      }
    } catch (err) {
      console.error('Failed to add question:', err)
    }
    setSaving(false)
  }

  if (loading) return <div className="text-sm text-slate-400">Loading flashcards…</div>

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        <TagPill label="All" active={activeTag === ALL_TAG} count={questions.length} onClick={() => setActiveTag(ALL_TAG)} />
        {allTags.map((tag) => (
          <TagPill key={tag} label={tag} active={activeTag === tag} count={questions.filter((q) => q.tags.includes(tag)).length} onClick={() => setActiveTag(tag)} />
        ))}
      </div>

      <div className="space-y-1 mb-4">
        {filtered.length === 0 && <p className="text-sm text-slate-400 py-2">No flashcards{activeTag !== ALL_TAG ? ` tagged "${activeTag}"` : ''} yet.</p>}
        {filtered.map((q) => {
          const isOpen = expanded.has(q.id)
          return (
            <div key={q.id} className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="flex items-start">
                <button
                  type="button"
                  onClick={() => toggleExpand(q.id)}
                  className="flex-1 flex items-start gap-2 px-4 py-3 text-left hover:bg-slate-50 transition-colors min-w-0"
                >
                  <span className="mt-0.5 shrink-0">
                    {isOpen ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
                  </span>
                  <span className="text-sm text-slate-800 font-medium leading-snug flex-1 min-w-0">{q.question}</span>
                  <div className="flex items-center gap-1 shrink-0 mt-0.5">
                    {q.tags.slice(0, 3).map((t) => (
                      <span key={t} className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full whitespace-nowrap">{t}</span>
                    ))}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(q.id)}
                  className="px-3 py-3 text-slate-300 hover:text-red-500 transition-colors shrink-0 touch-target"
                  title="Delete"
                >
                  <Trash2 size={13} />
                </button>
              </div>
              {isOpen && (
                <div className="border-t border-slate-100 bg-slate-50 px-4 py-3">
                  <MarkdownContent>{q.answer}</MarkdownContent>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {showForm ? (
        <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 space-y-3">
          <p className="text-sm font-semibold text-slate-700">New Flashcard</p>
          <textarea
            placeholder="Question"
            value={form.question}
            onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={2}
          />
          <textarea
            placeholder="Answer (markdown supported)"
            value={form.answer}
            onChange={(e) => setForm((f) => ({ ...f, answer: e.target.value }))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={6}
          />
          <input
            placeholder="Tags (comma-separated, e.g. cpp, linux, profiling)"
            value={form.tags}
            onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAdd}
              disabled={saving || !form.question.trim() || !form.answer.trim()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving…' : 'Add'}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setForm({ question: '', answer: '', tags: '' }) }}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-4 py-2.5 text-sm text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
        >
          <Plus size={14} />
          Add Flashcard
        </button>
      )}
    </div>
  )
}

function TagPill({ label, active, count, onClick }: { label: string; active: boolean; count: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'rounded-full px-3 py-1.5 text-xs font-medium border transition-colors',
        active ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-300 text-slate-600 hover:border-slate-400 hover:bg-slate-50',
      ].join(' ')}
    >
      {label} <span className={active ? 'opacity-70' : 'text-slate-400'}>{count}</span>
    </button>
  )
}
