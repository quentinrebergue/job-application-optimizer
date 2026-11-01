'use client'

import { useEffect, useRef, useState } from 'react'
import type { ResumeProfile } from '@/schemas/resume-profile'
import { Alert } from '@/components/ui/Alert'
import { Field } from '@/components/ui/Field'
import { Input, Textarea } from '@/components/ui/Input'
import { LIMITS } from '@/config/limits'
import { counterFor, tooLong } from '@/lib/text-limit'
import { useFieldAutosave } from '@/hooks/useFieldAutosave'
import { fetchJson } from '@/lib/http'

type ProfileField = keyof ResumeProfile

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** The profile, loaded once, then edited in place. */
export function ResumeDefaultsEditor({ inline = false }: { inline?: boolean }) {
  const [profile, setProfile] = useState<ResumeProfile | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchJson<ResumeProfile>('/api/resume/defaults')
      .then(setProfile)
      .catch((err) => setError(err instanceof Error ? err.message : 'Profile not loaded.'))
  }, [])

  if (error) return <Alert>Profile not loaded: {error}</Alert>
  if (!profile) return <p className="text-small text-ink-muted">Loading your profile…</p>
  return <ProfileForm initial={profile} inline={inline} />
}

/**
 * Contact details and default texts of every resume. Each field saves itself;
 * the API replaces the whole profile, so every save sends all the latest values
 * (the AI context, no longer edited here, is sent back unchanged).
 */
function ProfileForm({ initial, inline }: { initial: ResumeProfile; inline: boolean }) {
  const latest = useRef<ResumeProfile>(initial)
  const { values, errors, state, failure, edit } = useFieldAutosave<ResumeProfile>({
    initial,
    validate: (field, value) =>
      (field === 'email' && value.trim() && !EMAIL.test(value.trim()) ? 'Enter a valid email address.' : undefined) ??
      tooLong(value, LIMITS.profile[field]),
    save: async (field, value) => {
      latest.current = { ...latest.current, [field]: value }
      try {
        await fetchJson('/api/resume/defaults', { method: 'PUT', json: latest.current })
      } catch (err) {
        throw err
      }
    },
  })

  const text = (field: ProfileField, label: string, extra: { placeholder?: string; hint?: string; type?: string; span?: string } = {}) => (
    <Field label={label} hint={extra.hint} error={errors[field]} className={extra.span}>
      <Input type={extra.type ?? 'text'} value={values[field]} onChange={(e) => edit(field, e.target.value)} maxLength={LIMITS.profile[field]} placeholder={extra.placeholder} />
    </Field>
  )

  return (
    <div className="flex flex-col gap-field">
      {/* On the section title's line (the section is `relative`): no space reserved for it. */}
      {/* `inline`: in a dialog, where there is no section title to sit on. */}
      <p aria-live="polite" className={inline ? 'text-small text-ink-muted' : 'absolute right-4 top-5 text-small text-ink-muted md:right-6 md:top-7'}>{state === 'saving' ? 'Saving…' : ''}</p>
      {failure && <Alert>Profile not saved: {failure}</Alert>}

      {/* Short fields side by side: three in a row on a wide screen, two on a tablet, one on a phone. */}
      <div className="grid gap-field sm:grid-cols-2 lg:grid-cols-3">
        {text('full_name', 'Full name', { placeholder: 'Alex Morgan' })}
        {text('email', 'Email', { type: 'email', placeholder: 'alex.morgan@example.com' })}
        {text('phone', 'Phone', { placeholder: '+00 000 000 000' })}
        {text('linkedin', 'LinkedIn', { placeholder: 'linkedin.com/in/alex-morgan' })}
        {text('github', 'GitHub', { placeholder: 'github.com/alex-morgan' })}
        {text('address', 'Address', { placeholder: 'City, Country' })}
        {text('resume_title', 'Resume title', { placeholder: 'Project Coordinator', hint: 'Shown under your name; a job can use its own.', span: 'sm:col-span-2 lg:col-span-3' })}
        <Field
          label="Profile"
          hint="The short paragraph at the top of the resume; a job can use its own."
          error={errors.profile_text}
          count={counterFor(values.profile_text, LIMITS.profile.profile_text)}
          className="sm:col-span-2 lg:col-span-3"
        >
          <Textarea value={values.profile_text} onChange={(e) => edit('profile_text', e.target.value)} autoGrow rows={2} className="min-h-16" placeholder="A few lines about you. Line breaks are kept." />
        </Field>
      </div>
    </div>
  )
}
