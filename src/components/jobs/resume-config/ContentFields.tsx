'use client'

import { SectionTitle } from '@/components/ui/SectionTitle'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Input, Textarea } from '@/components/ui/Input'
import { LIMITS } from '@/config/limits'
import { counterFor, tooLong } from '@/lib/text-limit'
import { diffWords } from '@/lib/text-diff'
import type { HeaderSuggestion } from './logic'
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
  /** What the AI proposes for this offer (#294), shown under its field. */
  suggestions?: HeaderSuggestion[]
  /** "Keep mine": the suggestion of this analysis is turned down. */
  onKeep?: (field: HeaderField) => void
}

/**
 * The AI's proposal for one field: its text with the words that differ from yours marked, the new words to check, and
 * the two choices. Using it saves it as the text of this job; the Resume page keeps your own.
 */
function Suggestion({ suggestion, current, onUse, onKeep }: { suggestion: HeaderSuggestion; current: string; onUse: () => void; onKeep?: () => void }) {
  return (
    <div className="flex flex-col gap-label rounded-control border-2 border-ink bg-panel p-card" role="group" aria-label="Suggestion for this offer">
      <p className="text-caption text-ink-muted">For this offer:</p>
      <p className="text-small whitespace-pre-line">
        {diffWords(current, suggestion.text).map((part, i) =>
          part.changed ? <mark key={i} className="bg-warning text-ink">{part.text}</mark> : <span key={i}>{part.text}</span>,
        )}
      </p>
      {suggestion.newTerms.length > 0 && (
        <p className="text-caption text-ink-muted">Not in your library or the offer, check them: {suggestion.newTerms.join(', ')}.</p>
      )}
      <div className="flex flex-wrap gap-actions">
        <Button size="sm" onClick={onUse}>Use this</Button>
        {onKeep && <Button variant="ghost" size="sm" onClick={onKeep}>Keep mine</Button>}
      </div>
    </div>
  )
}

/** The top of the resume for this job: title and profile, each falling back to your defaults. */
export function ContentFields({ drafts, defaults, saved, onChange, suggestions = [], onKeep }: Props) {
  const suggestionFor = (field: HeaderField) => {
    const suggestion = suggestions.find((s) => s.field === field)
    return suggestion ? <Suggestion suggestion={suggestion} current={drafts[field]} onUse={() => onChange(field, suggestion.text)} onKeep={onKeep && (() => onKeep(field))} /> : null
  }

  const hint = (field: HeaderField, base: string) =>
    !saved[field] && defaults[field] && drafts[field] === defaults[field] ? `${base} From your defaults.` : base

  const useDefault = (field: HeaderField) =>
    defaults[field] && drafts[field] !== defaults[field] ? (
      <Button variant="ghost" size="sm" className="h-auto self-start px-0" onClick={() => onChange(field, defaults[field])}>
        Use my default
      </Button>
    ) : null

  return (
    <section aria-labelledby="section-header" className="flex flex-col gap-heading">
      <SectionTitle as="h4" id="section-header">Header</SectionTitle>
      <div className="flex flex-col gap-label">
        <Field label="Resume title" hint={hint('resume_title', 'Shown under your name.')}>
          <Input
            value={drafts.resume_title}
            onChange={(e) => onChange('resume_title', e.target.value)}
            maxLength={LIMITS.profile.resume_title}
            placeholder="Software Engineer — Systems & Networking"
          />
        </Field>
        {useDefault('resume_title')}
        {suggestionFor('resume_title')}
      </div>
      <div className="flex flex-col gap-label">
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
        {suggestionFor('profile_text')}
      </div>
    </section>
  )
}
