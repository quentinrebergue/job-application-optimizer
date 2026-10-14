'use client'

import type { EntityType } from '@/types'
import { Field } from '@/components/ui/Field'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { cn } from '@/lib/cn'
import { counterFor, isLongText, tooLong } from '@/lib/text-limit'
import { ENTITY_FIELDS, type FieldValues } from './entity-fields'

interface Props {
  type: EntityType
  values: FieldValues
  errors?: Partial<Record<string, string>>
  onChange: (key: string, value: string) => void
}

/** The fields of one kind of entry, from ENTITY_FIELDS, in a two-column grid (one column on a phone, except the short fields: a place and a period side by side). */
export function EntityFields({ type, values, errors = {}, onChange }: Props) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {ENTITY_FIELDS[type].map((field) => {
        const value = values[field.key] ?? ''
        // A long text is never cut while typing or pasting: it counts, and says when it is too long.
        const long = isLongText(field.maxLength)
        return (
        <Field
          key={field.key}
          label={field.label}
          hint={field.hint}
          error={errors[field.key] || (long ? tooLong(value, field.maxLength) : undefined)}
          count={counterFor(value, field.maxLength)}
          className={cn(field.wide ? 'col-span-2' : field.short ? 'col-span-1' : 'col-span-2 sm:col-span-1')}
        >
          {field.kind === 'textarea' ? (
            <Textarea value={values[field.key] ?? ''} onChange={(e) => onChange(field.key, e.target.value)} placeholder={field.placeholder} autoGrow className="min-h-52" />
          ) : field.kind === 'select' ? (
            <Select value={values[field.key] ?? ''} onChange={(e) => onChange(field.key, e.target.value)}>
              {field.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          ) : (
            <Input value={values[field.key] ?? ''} onChange={(e) => onChange(field.key, e.target.value)} placeholder={field.placeholder} required={field.required} maxLength={field.kind === 'text' ? field.maxLength : undefined} />
          )}
        </Field>
        )
      })}
    </div>
  )
}
