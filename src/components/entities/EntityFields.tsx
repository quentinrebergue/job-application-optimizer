'use client'

import type { EntityType } from '@/types'
import { Field } from '@/components/ui/Field'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { cn } from '@/lib/cn'
import { ENTITY_FIELDS, type FieldValues } from './entity-fields'

interface Props {
  type: EntityType
  values: FieldValues
  errors?: Partial<Record<string, string>>
  onChange: (key: string, value: string) => void
}

/** The fields of one kind of entry, from ENTITY_FIELDS, in a two-column grid. */
export function EntityFields({ type, values, errors = {}, onChange }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {ENTITY_FIELDS[type].map((field) => (
        <Field
          key={field.key}
          label={field.label}
          hint={field.hint}
          error={errors[field.key]}
          className={cn(field.wide && 'sm:col-span-2')}
        >
          {field.kind === 'textarea' ? (
            <Textarea value={values[field.key] ?? ''} onChange={(e) => onChange(field.key, e.target.value)} placeholder={field.placeholder} autoGrow />
          ) : field.kind === 'select' ? (
            <Select value={values[field.key] ?? ''} onChange={(e) => onChange(field.key, e.target.value)}>
              {field.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          ) : (
            <Input value={values[field.key] ?? ''} onChange={(e) => onChange(field.key, e.target.value)} placeholder={field.placeholder} required={field.required} />
          )}
        </Field>
      ))}
    </div>
  )
}
