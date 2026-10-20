'use client'

import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Input, Textarea } from '@/components/ui/Input'
import { LIMITS } from '@/config/limits'
import { makeMain, nextVersionName, parseVariants, serializeVariants } from '@/lib/description-variants'
import { counterFor, tooLong } from '@/lib/text-limit'
import { DeleteButton } from './DeleteButton'

interface Props {
  /** The main description, so that a version can take its place. */
  description: string
  /** The versions, as the form keeps them (one string). */
  value: string
  /** The most a text may hold. */
  limit: number
  error?: string
  onChange: (value: string) => void
  /** A version becomes the main description (and the main one a version): both change at once. */
  onMakeMain: (description: string, value: string) => void
}

/**
 * The other versions of a description (#297): a short one, a technical one... A job picks which to print.
 * Each is a name and a text; the main description above stays what the AI reads.
 */
export function VariantsEditor({ description, value, limit, error, onChange, onMakeMain }: Props) {
  const variants = parseVariants(value)
  const change = (index: number, patch: Partial<{ name: string; text: string }>) =>
    onChange(serializeVariants(variants.map((v, i) => (i === index ? { ...v, ...patch } : v))))

  return (
    <div className="col-span-2 flex flex-col gap-field">
      {variants.map((variant, index) => (
        <div key={index} className="flex flex-col gap-field rounded-lg border border-line p-card">
          <Field label="Name of this version" count={undefined}>
            <Input value={variant.name} onChange={(e) => change(index, { name: e.target.value })} placeholder="Short" maxLength={LIMITS.descriptionVariants.name} />
          </Field>
          <Field label={`Text of ${variant.name.trim() || 'this version'}`} error={tooLong(variant.text, limit)} count={counterFor(variant.text, limit)}>
            <Textarea value={variant.text} onChange={(e) => change(index, { text: e.target.value })} autoGrow />
          </Field>
          <div className="flex flex-wrap justify-between gap-actions">
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-0"
              onClick={() => {
                const next = makeMain(description, variants, index)
                onMakeMain(next.description, serializeVariants(next.variants))
              }}
            >
              Use as the main description
            </Button>
            <DeleteButton
              name={variant.name.trim() || 'this version'}
              onConfirm={() => onChange(serializeVariants(variants.filter((_, i) => i !== index)))}
            />
          </div>
        </div>
      ))}
      {error && <p role="alert" className="text-small text-danger">{error}</p>}
      {variants.length < LIMITS.descriptionVariants.perEntry && (
        <div>
          <Button variant="ghost" size="sm" onClick={() => onChange(serializeVariants([...variants, { name: nextVersionName(variants), text: '' }]))}>
            <Plus aria-hidden className="size-4" /> Add a version of the description
          </Button>
        </div>
      )}
    </div>
  )
}
