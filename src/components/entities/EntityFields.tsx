'use client'

import type { EntityType } from '@/types'
import { Field } from '@/components/ui/Field'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { cn } from '@/lib/cn'
import { counterFor, isLongText, tooLong } from '@/lib/text-limit'
import { ENTITY_FIELDS, type FieldValues } from './entity-fields'

/**
 * The least height of a description. On a computer 13 rem. In the drawer of a phone, as much as fits without the drawer
 * scrolling: the drawer is at most 90dvh high and the rest of the tallest form takes about 34 rem (measured at 375 px
 * wide: 538 px with the handle and the padding), so the description gets what is left, between 4 and 13 rem (it still grows as you type).
 */
const DESCRIPTION_HEIGHT = 'min-h-[clamp(4rem,calc(90dvh_-_34rem),13rem)] md:min-h-52'

interface Props {
  type: EntityType
  values: FieldValues
  errors?: Partial<Record<string, string>>
  onChange: (key: string, value: string) => void
}

/** The fields of one kind of entry, from ENTITY_FIELDS, in a two-column grid (one column on a phone, except the short fields: a place and a period side by side). */
export function EntityFields({ type, values, errors = {}, onChange }: Props) {
  return (
    <div className="grid grid-cols-2 gap-field">
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
            <Textarea value={values[field.key] ?? ''} onChange={(e) => onChange(field.key, e.target.value)} placeholder={field.placeholder} autoGrow className={DESCRIPTION_HEIGHT} />
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
