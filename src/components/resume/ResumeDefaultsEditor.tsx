'use client'

import { useEffect, useRef, useState } from 'react'
import type { ResumeProfile } from '@/schemas/resume-profile'
import { Alert } from '@/components/ui/Alert'
import { Field } from '@/components/ui/Field'
import { Input, Textarea } from '@/components/ui/Input'
import { useFieldAutosave } from '@/hooks/useFieldAutosave'
import { fetchJson, HttpError } from '@/lib/http'

type ProfileField = keyof ResumeProfile

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** The profile, loaded once, then edited in place. */
export function ResumeDefaultsEditor() {
  const [profile, setProfile] = useState<ResumeProfile | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchJson<ResumeProfile>('/api/resume/defaults')
      .then(setProfile)
      .catch((err) => setError(err instanceof Error ? err.message : 'Profile not loaded.'))
  }, [])

  if (error) return <Alert>Profile not loaded: {error}</Alert>
  if (!profile) return <p className="text-sm text-ink-muted">Loading your profile…</p>
  return <ProfileForm initial={profile} />
}

/**
 * Contact details and default texts of every resume. Each field saves itself;
 * the API replaces the whole profile, so every save sends all the latest values
 * (the AI context, no longer edited here, is sent back unchanged).
 */
function ProfileForm({ initial }: { initial: ResumeProfile }) {
  const latest = useRef<ResumeProfile>(initial)
  const { values, errors, state, failure, edit } = useFieldAutosave<ResumeProfile>({
    initial,
    validate: (field, value) => (field === 'email' && value.trim() && !EMAIL.test(value.trim()) ? 'Enter a valid email address.' : undefined),
    save: async (field, value) => {
      latest.current = { ...latest.current, [field]: value }
      try {
        await fetchJson('/api/resume/defaults', { method: 'PUT', json: latest.current })
      } catch (err) {
        if (err instanceof HttpError && err.status === 400) throw new Error('Check the highlighted field.')
        throw err
      }
    },
  })

  const text = (field: ProfileField, label: string, extra: { placeholder?: string; hint?: string; type?: string; wide?: boolean } = {}) => (
    <Field label={label} hint={extra.hint} error={errors[field]} className={extra.wide ? 'sm:col-span-2' : undefined}>
      <Input type={extra.type ?? 'text'} value={values[field]} onChange={(e) => edit(field, e.target.value)} placeholder={extra.placeholder} />
    </Field>
  )

  return (
    <div className="flex flex-col gap-4">
      {/* On the section title's line (the section is `relative`): no space reserved for it. */}
      <p aria-live="polite" className="absolute right-4 top-5 text-sm text-ink-muted md:right-6 md:top-7">{state === 'saving' ? 'Saving…' : ''}</p>
      {failure && <Alert>Profile not saved: {failure}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2">
        {text('full_name', 'Full name', { placeholder: 'Ada Lovelace' })}
        {text('email', 'Email', { type: 'email', placeholder: 'ada@example.com' })}
        {text('linkedin', 'LinkedIn', { placeholder: 'linkedin.com/in/ada' })}
        {text('phone', 'Phone', { placeholder: '+33 6 00 00 00 00' })}
        {text('address', 'Address', { placeholder: 'Paris, France', wide: true })}
        {text('resume_title', 'Resume title', { placeholder: 'Graduate Software Engineer — Systems', hint: 'Shown under your name; a job can use its own.', wide: true })}
        <Field label="Profile" hint="The short paragraph at the top of the resume; a job can use its own." className="sm:col-span-2">
          <Textarea value={values.profile_text} onChange={(e) => edit('profile_text', e.target.value)} autoGrow placeholder="A few lines about you. Line breaks are kept." />
        </Field>
      </div>
    </div>
  )
}
