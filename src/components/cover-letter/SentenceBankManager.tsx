'use client'

import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react'
import {
  COVER_LETTER_CATEGORIES,
  COVER_LETTER_CATEGORY_LABELS,
  COVER_LETTER_CATEGORY_COLORS,
  type CoverLetterCategory,
  type CoverLetterSentence,
} from '@/types/cover-letter'

function CategoryBadge({ category }: { category: CoverLetterCategory }) {
  return (
    <span className={`inline-block rounded border px-2 py-0.5 text-xs font-medium ${COVER_LETTER_CATEGORY_COLORS[category]}`}>
      {COVER_LETTER_CATEGORY_LABELS[category]}
    </span>
  )
}

interface SentenceRowProps {
  sentence: CoverLetterSentence
  onUpdate: (id: string, data: Partial<CoverLetterSentence>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

function SentenceRow({ sentence, onUpdate, onDelete }: SentenceRowProps) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(sentence.text)
  const [category, setCategory] = useState<CoverLetterCategory>(sentence.category)
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    await onUpdate(sentence.id, { text: text.trim(), category })
    setSaving(false)
    setEditing(false)
  }

  function cancel() {
    setText(sentence.text)
    setCategory(sentence.category)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 space-y-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-none"
          autoFocus
        />
        <div className="flex items-center gap-2">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as CoverLetterCategory)}
            className="rounded border border-slate-300 px-2 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {COVER_LETTER_CATEGORIES.map((c) => (
              <option key={c} value={c}>{COVER_LETTER_CATEGORY_LABELS[c]}</option>
            ))}
          </select>
          <div className="ml-auto flex gap-2">
            <button onClick={cancel} className="p-1.5 rounded hover:bg-slate-200 text-slate-500 transition-colors">
              <X size={14} />
            </button>
            <button
              onClick={save}
              disabled={saving || !text.trim()}
              className="flex items-center gap-1 px-2 py-1 rounded bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Check size={13} />
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="group flex items-start gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3 hover:border-slate-300 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-800 leading-relaxed">{sentence.text}</p>
        <div className="mt-1.5">
          <CategoryBadge category={sentence.category} />
        </div>
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 pt-0.5">
        <button
          onClick={() => setEditing(true)}
          className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
        >
          <Pencil size={13} />
        </button>
        <button
          onClick={() => onDelete(sentence.id)}
          className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

interface AddSentenceFormProps {
  onAdd: (text: string, category: CoverLetterCategory) => Promise<void>
  onClose: () => void
}

function AddSentenceForm({ onAdd, onClose }: AddSentenceFormProps) {
  const [text, setText] = useState('')
  const [category, setCategory] = useState<CoverLetterCategory>('motivation')
  const [saving, setSaving] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    setSaving(true)
    await onAdd(text.trim(), category)
    setSaving(false)
    setText('')
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-blue-200 bg-blue-50 p-3 space-y-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write a sentence or short paragraph you might use in a cover letter…"
        rows={3}
        className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-none"
        autoFocus
      />
      <div className="flex items-center gap-2">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as CoverLetterCategory)}
          className="rounded border border-slate-300 px-2 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {COVER_LETTER_CATEGORIES.map((c) => (
            <option key={c} value={c}>{COVER_LETTER_CATEGORY_LABELS[c]}</option>
          ))}
        </select>
        <div className="ml-auto flex gap-2">
          <button type="button" onClick={onClose} className="p-1.5 rounded hover:bg-slate-200 text-slate-500 transition-colors">
            <X size={14} />
          </button>
          <button
            type="submit"
            disabled={saving || !text.trim()}
            className="flex items-center gap-1 px-2 py-1 rounded bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Check size={13} />
            {saving ? 'Adding…' : 'Add'}
          </button>
        </div>
      </div>
    </form>
  )
}

export function SentenceBankManager() {
  const [sentences, setSentences] = useState<CoverLetterSentence[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [activeCategory, setActiveCategory] = useState<CoverLetterCategory | 'all'>('all')

  useEffect(() => {
    fetch('/api/cover-letter/sentences')
      .then((r) => r.json())
      .then(setSentences)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  async function handleAdd(text: string, category: CoverLetterCategory) {
    const res = await fetch('/api/cover-letter/sentences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, category }),
    })
    if (res.ok) {
      const created: CoverLetterSentence = await res.json()
      setSentences((prev) => [...prev, created])
      setAdding(false)
    }
  }

  async function handleUpdate(id: string, data: Partial<CoverLetterSentence>) {
    const res = await fetch(`/api/cover-letter/sentences/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      const updated: CoverLetterSentence = await res.json()
      setSentences((prev) => prev.map((s) => (s.id === id ? updated : s)))
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this sentence?')) return
    await fetch(`/api/cover-letter/sentences/${id}`, { method: 'DELETE' })
    setSentences((prev) => prev.filter((s) => s.id !== id))
  }

  const filtered =
    activeCategory === 'all'
      ? sentences
      : sentences.filter((s) => s.category === activeCategory)

  const countByCategory = COVER_LETTER_CATEGORIES.reduce<Record<string, number>>(
    (acc, c) => ({ ...acc, [c]: sentences.filter((s) => s.category === c).length }),
    {}
  )

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Cover Letter Sentence Bank</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Build a library of sentences. The AI will pick the best ones for each job.
          </p>
        </div>
        <button
          onClick={() => setAdding((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <Plus size={14} />
          Add sentence
        </button>
      </div>

      {/* Category filter tabs */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        <button
          onClick={() => setActiveCategory('all')}
          className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
            activeCategory === 'all'
              ? 'bg-slate-800 text-white border-slate-800'
              : 'border-slate-300 text-slate-600 hover:bg-slate-50'
          }`}
        >
          All ({sentences.length})
        </button>
        {COVER_LETTER_CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setActiveCategory(c)}
            className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
              activeCategory === c
                ? 'bg-slate-800 text-white border-slate-800'
                : 'border-slate-300 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {COVER_LETTER_CATEGORY_LABELS[c]} ({countByCategory[c] ?? 0})
          </button>
        ))}
      </div>

      {adding && (
        <div className="mb-3">
          <AddSentenceForm onAdd={handleAdd} onClose={() => setAdding(false)} />
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-slate-400 py-4 text-center">
          {sentences.length === 0
            ? 'No sentences yet. Add your first one above.'
            : 'No sentences in this category.'}
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((s) => (
            <SentenceRow
              key={s.id}
              sentence={s}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}
