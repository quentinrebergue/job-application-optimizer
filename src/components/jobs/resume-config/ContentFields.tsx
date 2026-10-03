'use client'

import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Input, Textarea } from '@/components/ui/Input'
import { AiSuggestion } from './AiSuggestion'
import type { TextField } from './useResumeConfig'

type Texts = Record<TextField, string>

interface Props {
  drafts: Texts
  /** Global defaults (Resume page) */
  defaults: Texts
  /** What is saved for this job: an empty value means "use the default" */
  saved: Partial<Texts>
  aiTitle?: string
  aiProfile?: string
  onChange: (field: TextField, value: string) => void
}

function hint(field: TextField, drafts: Texts, defaults: Texts, saved: Partial<Texts>, base: string): string {
  const fromDefault = !saved[field] && defaults[field] && drafts[field] === defaults[field]
  return fromDefault ? `${base} From your defaults.` : base
}

/** Resume title, profile and AI context for this job, with the AI's suggestions. */
export function ContentFields({ drafts, defaults, saved, aiTitle, aiProfile, onChange }: Props) {
  const useDefault = (field: TextField) =>
    defaults[field] && drafts[field] !== defaults[field] ? (
      <Button variant="ghost" size="sm" className="h-auto self-start px-0" onClick={() => onChange(field, defaults[field])}>
        Use my default
      </Button>
    ) : null

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Field label="Resume title" hint={hint('resume_title', drafts, defaults, saved, 'Shown under your name.')}>
          <Input
            value={drafts.resume_title}
            onChange={(e) => onChange('resume_title', e.target.value)}
            placeholder="Software Engineer — Systems & Networking"
          />
        </Field>
        {useDefault('resume_title')}
        {aiTitle && drafts.resume_title !== aiTitle && (
          <AiSuggestion text={aiTitle} onApply={() => onChange('resume_title', aiTitle)} />
        )}
      </div>

      <div>
        <Field label="Profile" hint={hint('profile_text', drafts, defaults, saved, 'The short paragraph at the top of the resume.')}>
          <Textarea
            value={drafts.profile_text}
            onChange={(e) => onChange('profile_text', e.target.value)}
            rows={4}
            className="resize-y"
            placeholder="Engineering student with experience in systems programming and embedded Linux."
          />
        </Field>
        {useDefault('profile_text')}
        {aiProfile && drafts.profile_text !== aiProfile && (
          <AiSuggestion text={aiProfile} onApply={() => onChange('profile_text', aiProfile)} />
        )}
      </div>

      <div>
        <Field label="Context for the AI" hint={hint('ai_context', drafts, defaults, saved, 'Sent to the AI only, never printed.')}>
          <Textarea
            value={drafts.ai_context}
            onChange={(e) => onChange('ai_context', e.target.value)}
            rows={3}
            className="resize-y"
            placeholder="I'm targeting a junior embedded position. My strongest area is C/Linux."
          />
        </Field>
        {useDefault('ai_context')}
      </div>
    </div>
  )
}
