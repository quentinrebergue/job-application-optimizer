'use client'

import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Input, Textarea } from '@/components/ui/Input'
import { LIMITS } from '@/config/limits'
import { counterFor, tooLong } from '@/lib/text-limit'
import type { TextField } from './useResumeConfig'

type HeaderField = Extract<TextField, 'resume_title' | 'profile_text'>
type Texts = Record<HeaderField, string>

interface Props {
  drafts: Texts
  /** Global defaults (Resume page) */
  defaults: Texts
  /** What is saved for this job: an empty value means "use the default" */
  saved: Partial<Texts>
  onChange: (field: HeaderField, value: string) => void
}

/** The top of the resume for this job: title and profile, each falling back to your defaults. */
export function ContentFields({ drafts, defaults, saved, onChange }: Props) {
  const hint = (field: HeaderField, base: string) =>
    !saved[field] && defaults[field] && drafts[field] === defaults[field] ? `${base} From your defaults.` : base

  const useDefault = (field: HeaderField) =>
    defaults[field] && drafts[field] !== defaults[field] ? (
      <Button variant="ghost" size="sm" className="h-auto self-start px-0" onClick={() => onChange(field, defaults[field])}>
        Use my default
      </Button>
    ) : null

  return (
    <section aria-labelledby="section-header" className="flex flex-col gap-4">
      <h4 id="section-header" className="text-lg font-extrabold">Header</h4>
      <div className="flex flex-col gap-1">
        <Field label="Resume title" hint={hint('resume_title', 'Shown under your name.')}>
          <Input
            value={drafts.resume_title}
            onChange={(e) => onChange('resume_title', e.target.value)}
            maxLength={LIMITS.profile.resume_title}
            placeholder="Software Engineer — Systems & Networking"
          />
        </Field>
        {useDefault('resume_title')}
      </div>
      <div className="flex flex-col gap-1">
        <Field
          label="Profile"
          hint={hint('profile_text', 'The short paragraph at the top of the resume.')}
          error={tooLong(drafts.profile_text, LIMITS.profile.profile_text)}
          count={counterFor(drafts.profile_text, LIMITS.profile.profile_text)}
        >
          <Textarea
            value={drafts.profile_text}
            onChange={(e) => onChange('profile_text', e.target.value)}
            autoGrow
            placeholder="Engineering student with experience in systems programming and embedded Linux."
          />
        </Field>
        {useDefault('profile_text')}
      </div>
    </section>
  )
}
