'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Select, Textarea } from '@/components/ui/Input'
import { LIMITS } from '@/config/limits'
import { counterFor, tooLong } from '@/lib/text-limit'

interface Props {
  /** Text used in the PDF: the custom one, or the library's */
  value: string
  original: string
  isCustom: boolean
  /** The names of the other versions the library keeps; the picker shows only when there are some. */
  versions?: string[]
  /** The version this job prints (absent: the main description). */
  version?: string
  onVersion?: (name: string | null) => void
  /** Saves a text; the original or an empty one removes the custom text. */
  onCommit: (value: string) => void
}

/**
 * Description of an experience or project for this resume only. Saved when the
 * field loses focus. The parent remounts it (key) when the saved text changes.
 */
export function DescriptionEditor({ value, original, isCustom, versions = [], version, onVersion, onCommit }: Props) {
  const [draft, setDraft] = useState(value)

  return (
    <div className="flex flex-col gap-2">
      {versions.length > 0 && onVersion && (
        <Field label="Version of the description" hint="Your library keeps several; the text below starts from the one chosen.">
          <Select value={version ?? ''} onChange={(e) => onVersion(e.target.value === '' ? null : e.target.value)}>
            <option value="">Main description</option>
            {versions.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </Select>
        </Field>
      )}
      <Field
        label="Description in this resume"
        hint={isCustom ? 'Custom for this job; the library keeps the original.' : 'From your library. Edit it for this job only.'}
        error={tooLong(draft, LIMITS.resume.entityDescription)}
        count={counterFor(draft, LIMITS.resume.entityDescription)}
      >
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => { if (draft !== value && !tooLong(draft, LIMITS.resume.entityDescription)) onCommit(draft) }}
          autoGrow
        />
      </Field>
      {isCustom && (
        <div>
          <Button variant="ghost" size="sm" className="h-auto px-0" onClick={() => onCommit(original)}>
            Back to the library text
          </Button>
        </div>
      )}
    </div>
  )
}
