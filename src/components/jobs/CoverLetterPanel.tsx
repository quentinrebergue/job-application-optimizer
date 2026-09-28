'use client'

import { useEffect, useState } from 'react'
import { Sparkles, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react'
import {
  COVER_LETTER_CATEGORIES,
  COVER_LETTER_CATEGORY_LABELS,
  COVER_LETTER_CATEGORY_COLORS,
  type CoverLetterCategory,
  type CoverLetterSentence,
} from '@/types/cover-letter'
import type { JobCoverLetterConfig } from '@/types/cover-letter'

function CategoryBadge({ category }: { category: CoverLetterCategory }) {
  return (
    <span className={`inline-block rounded border px-1.5 py-0.5 text-xs font-medium ${COVER_LETTER_CATEGORY_COLORS[category]}`}>
      {COVER_LETTER_CATEGORY_LABELS[category]}
    </span>
  )
}

interface SentencePickerProps {
  sentences: CoverLetterSentence[]
  selectedIds: string[]
  onToggle: (id: string) => void
}

function SentencePicker({ sentences, selectedIds, onToggle }: SentencePickerProps) {
  const [activeCategory, setActiveCategory] = useState<CoverLetterCategory | 'all'>('all')

  const filtered =
    activeCategory === 'all' ? sentences : sentences.filter((s) => s.category === activeCategory)

  const countSelected = selectedIds.length

  return (
    <div>
      {/* Category tabs */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        <button
          onClick={() => setActiveCategory('all')}
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium border transition-colors ${
            activeCategory === 'all'
              ? 'bg-slate-800 text-white border-slate-800'
              : 'border-slate-300 text-slate-600 hover:bg-slate-50'
          }`}
        >
          All
        </button>
        {COVER_LETTER_CATEGORIES.filter((c) => sentences.some((s) => s.category === c)).map((c) => (
          <button
            key={c}
            onClick={() => setActiveCategory(c)}
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium border transition-colors ${
              activeCategory === c
                ? 'bg-slate-800 text-white border-slate-800'
                : 'border-slate-300 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {COVER_LETTER_CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-xs text-slate-400 py-3 text-center">
          No sentences yet.{' '}
          <a href="/resume" className="text-blue-600 hover:underline">
            Add some in the Resume Builder.
          </a>
        </p>
      ) : (
        <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
          {filtered.map((s) => {
            const selected = selectedIds.includes(s.id)
            return (
              <button
                key={s.id}
                onClick={() => onToggle(s.id)}
                className={`w-full text-left rounded-lg border px-3 py-2.5 transition-colors ${
                  selected
                    ? 'border-blue-300 bg-blue-50'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start gap-2">
                  <div
                    className={`mt-0.5 h-4 w-4 shrink-0 rounded border-2 transition-colors flex items-center justify-center ${
                      selected ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                    }`}
                  >
                    {selected && <Check size={10} className="text-white" strokeWidth={3} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-800 leading-relaxed">{s.text}</p>
                    <div className="mt-1">
                      <CategoryBadge category={s.category} />
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {countSelected > 0 && (
        <p className="text-xs text-blue-600 font-medium mt-2">
          {countSelected} sentence{countSelected > 1 ? 's' : ''} selected
        </p>
      )}
    </div>
  )
}

export function CoverLetterPanel({ jobId }: { jobId: string }) {
  const [open, setOpen] = useState(false)
  const [sentences, setSentences] = useState<CoverLetterSentence[]>([])
  const [config, setConfig] = useState<JobCoverLetterConfig>({
    selected_sentence_ids: [],
    generated_letter: '',
    ai_context: '',
  })
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  useEffect(() => {
    if (!open) return
    setLoading(true)
    Promise.all([
      fetch('/api/cover-letter/sentences').then((r) => r.json()),
      fetch(`/api/jobs/${jobId}/cover-letter`).then((r) => r.json()),
    ])
      .then(([sents, cfg]) => {
        setSentences(sents as CoverLetterSentence[])
        setConfig(cfg as JobCoverLetterConfig)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [open, jobId])

  function toggleSentence(id: string) {
    setConfig((prev) => ({
      ...prev,
      selected_sentence_ids: prev.selected_sentence_ids.includes(id)
        ? prev.selected_sentence_ids.filter((s) => s !== id)
        : [...prev.selected_sentence_ids, id],
    }))
  }

  async function saveConfig(updated: JobCoverLetterConfig) {
    setSaveStatus('saving')
    await fetch(`/api/jobs/${jobId}/cover-letter`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    })
    setSaveStatus('saved')
    setTimeout(() => setSaveStatus('idle'), 2000)
  }

  async function generate() {
    setGenerating(true)
    const res = await fetch(`/api/jobs/${jobId}/cover-letter/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        selected_sentence_ids: config.selected_sentence_ids,
        ai_context: config.ai_context,
      }),
    })
    if (res.ok) {
      const { letter } = await res.json() as { letter: string }
      setConfig((prev) => ({ ...prev, generated_letter: letter }))
    }
    setGenerating(false)
  }

  async function copyLetter() {
    await navigator.clipboard.writeText(config.generated_letter)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      {/* Header (always visible) */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors text-left"
      >
        <div>
          <h2 className="text-base font-semibold text-slate-900">Cover Letter</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {config.generated_letter
              ? 'AI-generated letter ready — click to view or regenerate'
              : 'Select sentences from your bank and generate with AI'}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {config.generated_letter && (
            <span className="rounded-full bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 text-xs font-medium">
              Generated
            </span>
          )}
          {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-200 p-5 space-y-5">
          {loading ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : (
            <>
              {/* Sentence picker */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2">
                  Select sentences to use as inspiration
                </label>
                <SentencePicker
                  sentences={sentences}
                  selectedIds={config.selected_sentence_ids}
                  onToggle={toggleSentence}
                />
              </div>

              {/* AI context */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Additional context{' '}
                  <span className="text-slate-400 font-normal">(sent to AI only, not in the letter)</span>
                </label>
                <textarea
                  value={config.ai_context}
                  onChange={(e) => setConfig((prev) => ({ ...prev, ai_context: e.target.value }))}
                  onBlur={() => saveConfig(config)}
                  placeholder="e.g. I want a formal tone. Emphasise my systems programming background."
                  rows={2}
                  className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Generate button */}
              <div className="flex items-center gap-3">
                <button
                  onClick={generate}
                  disabled={generating || config.selected_sentence_ids.length === 0}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  <Sparkles size={15} />
                  {generating ? 'Generating…' : config.generated_letter ? 'Regenerate' : 'Generate with AI'}
                </button>
                <button
                  onClick={() => saveConfig(config)}
                  disabled={saveStatus === 'saving'}
                  className="text-sm px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-50 transition-colors font-medium text-slate-700"
                >
                  {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? '✓ Saved' : 'Save selection'}
                </button>
              </div>

              {/* Generated letter */}
              {config.generated_letter && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-slate-600">Generated letter</label>
                    <button
                      onClick={copyLetter}
                      className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 transition-colors"
                    >
                      {copied ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <textarea
                    value={config.generated_letter}
                    onChange={(e) => setConfig((prev) => ({ ...prev, generated_letter: e.target.value }))}
                    onBlur={() => saveConfig(config)}
                    rows={14}
                    className="w-full rounded border border-slate-300 px-3 py-2.5 text-sm text-slate-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-sans"
                  />
                  <p className="text-xs text-slate-400 mt-1">Editable — changes are saved on blur.</p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
