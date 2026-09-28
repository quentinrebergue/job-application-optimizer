'use client'

import { useEffect, useState } from 'react'

interface ResumeDefaults {
  resume_title: string
  profile_text: string
  ai_context: string
}

export function ResumeDefaultsEditor() {
  const [defaults, setDefaults] = useState<ResumeDefaults>({
    resume_title: '',
    profile_text: '',
    ai_context: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/resume/defaults')
      .then((r) => r.json())
      .then(setDefaults)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  async function save() {
    setSaving(true)
    setSaved(false)
    await fetch('/api/resume/defaults', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(defaults),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading) return <div className="text-sm text-slate-400">Loading defaults…</div>

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Default resume content</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Used as fallback for any job where the field is left blank.
          </p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="text-sm px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-50 font-medium transition-colors"
        >
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save'}
        </button>
      </div>

      {/* Resume Title */}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">
          Resume title <span className="text-slate-400 font-normal">(rendered in LaTeX header)</span>
        </label>
        <input
          type="text"
          value={defaults.resume_title}
          onChange={(e) => setDefaults((d) => ({ ...d, resume_title: e.target.value }))}
          placeholder="e.g. Graduate Software Engineer — Systems & Embedded"
          className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
      </div>

      {/* Profile */}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">
          Profile <span className="text-slate-400 font-normal">(LaTeX — used when no job-specific profile is set)</span>
        </label>
        <textarea
          value={defaults.profile_text}
          onChange={(e) => setDefaults((d) => ({ ...d, profile_text: e.target.value }))}
          rows={5}
          placeholder="Leave blank to use the hardcoded fallback in template.ts"
          className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y bg-white"
        />
      </div>

      {/* AI Context */}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">
          AI context <span className="text-slate-400 font-normal">(sent to AI only — not rendered in PDF)</span>
        </label>
        <textarea
          value={defaults.ai_context}
          onChange={(e) => setDefaults((d) => ({ ...d, ai_context: e.target.value }))}
          rows={3}
          placeholder="e.g. Candidate targeting embedded / low-level roles. Strong in C, Linux kernel, RTOS. No Rust yet."
          className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-y bg-white"
        />
      </div>
    </div>
  )
}
