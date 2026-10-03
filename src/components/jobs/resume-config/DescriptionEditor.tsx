'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Textarea } from '@/components/ui/Input'

interface Props {
  /** Text used in the PDF: the custom one, or the library's */
  value: string
  original: string
  isCustom: boolean
  /** Saves a text; the original or an empty one removes the custom text. */
  onCommit: (value: string) => void
}

/**
 * Description of an experience or project for this resume only. Saved when the
 * field loses focus. The parent remounts it (key) when the saved text changes.
 */
export function DescriptionEditor({ value, original, isCustom, onCommit }: Props) {
  const [draft, setDraft] = useState(value)

  return (
    <div className="flex flex-col gap-2">
      <Field
        label="Description in this resume"
        hint={isCustom ? 'Custom for this job; the library keeps the original.' : 'From your library. Edit it for this job only.'}
      >
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => { if (draft !== value) onCommit(draft) }}
          rows={4}
          className="resize-y"
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
