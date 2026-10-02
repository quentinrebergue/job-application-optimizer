'use client'

import { useEffect, useState } from 'react'
import type { ResumeProfile } from '@/schemas/resume-profile'

const EMPTY_PROFILE: ResumeProfile = {
  full_name: '',
  email: '',
  linkedin: '',
  phone: '',
  address: '',
  resume_title: '',
  profile_text: '',
  ai_context: '',
}

const INPUT_CLASS =
  'w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'

export function ResumeDefaultsEditor() {
  const [profile, setProfile] = useState<ResumeProfile>(EMPTY_PROFILE)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/resume/defaults')
      .then((r) => r.json())
      .then(setProfile)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  function update(field: keyof ResumeProfile, value: string) {
    setProfile((p) => ({ ...p, [field]: value }))
  }

  async function save() {
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      const res = await fetch('/api/resume/defaults', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { fields?: Record<string, string[]> } | null
        const first = body?.fields && Object.entries(body.fields)[0]
        setError(first ? `${first[0]}: ${first[1][0]}` : 'Could not save the profile.')
        return
      }
      setProfile(await res.json())
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="text-sm text-slate-400">Loading profile…</div>

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Resume profile</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Your contact details appear in the header of every resume. The title and profile
            text are used as fallback for any job where the field is left blank.
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

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Full name</label>
          <input
            type="text"
            value={profile.full_name}
            onChange={(e) => update('full_name', e.target.value)}
            placeholder="e.g. Ada Lovelace"
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
          <input
            type="email"
            value={profile.email}
            onChange={(e) => update('email', e.target.value)}
            placeholder="ada@example.com"
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">LinkedIn</label>
          <input
            type="text"
            value={profile.linkedin}
            onChange={(e) => update('linkedin', e.target.value)}
            placeholder="linkedin.com/in/ada"
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Phone</label>
          <input
            type="text"
            value={profile.phone}
            onChange={(e) => update('phone', e.target.value)}
            placeholder="+33 6 00 00 00 00"
            className={INPUT_CLASS}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-1">Address</label>
          <input
            type="text"
            value={profile.address}
            onChange={(e) => update('address', e.target.value)}
            placeholder="Paris, France"
            className={INPUT_CLASS}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">
          Resume title <span className="text-slate-400 font-normal">(shown under your name)</span>
        </label>
        <input
          type="text"
          value={profile.resume_title}
          onChange={(e) => update('resume_title', e.target.value)}
          placeholder="e.g. Graduate Software Engineer — Systems & Embedded"
          className={INPUT_CLASS}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">
          Profile <span className="text-slate-400 font-normal">(plain text — used when no job-specific profile is set)</span>
        </label>
        <textarea
          value={profile.profile_text}
          onChange={(e) => update('profile_text', e.target.value)}
          rows={5}
          placeholder="A few lines about you. Line breaks are kept."
          className={`${INPUT_CLASS} resize-y`}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">
          AI context <span className="text-slate-400 font-normal">(sent to AI only — not rendered in PDF)</span>
        </label>
        <textarea
          value={profile.ai_context}
          onChange={(e) => update('ai_context', e.target.value)}
          rows={3}
          placeholder="e.g. Candidate targeting embedded / low-level roles. Strong in C, Linux kernel, RTOS. No Rust yet."
          className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-y bg-white"
        />
      </div>
    </div>
  )
}
