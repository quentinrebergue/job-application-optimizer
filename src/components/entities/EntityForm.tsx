'use client'

import { useState } from 'react'
import type { EntityType } from '@/types'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { EntityFields } from './EntityFields'
import { fieldErrors, toPayload, toValues } from './entity-fields'

interface Props {
  type: EntityType
  saving?: boolean
  /** Throws to report a failure, shown above the form. */
  onSave: (data: ReturnType<typeof toPayload>) => Promise<void>
  onCancel?: () => void
}

/** Form to create a library entry of one kind. */
export function EntityForm({ type, saving, onSave, onCancel }: Props) {
  const [values, setValues] = useState(() => toValues(type))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [failure, setFailure] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFailure(null)
    const missing = fieldErrors(type, values)
    setErrors(missing)
    if (Object.keys(missing).length > 0) return
    try {
      await onSave(toPayload(type, values))
    } catch (err) {
      setFailure(err instanceof Error ? err.message : 'Something went wrong. Try again.')
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-1 flex-col gap-field">
      {failure && <Alert>{failure}</Alert>}
      <EntityFields
        type={type}
        values={values}
        errors={errors}
        onChange={(key, value) => {
          setValues((v) => ({ ...v, [key]: value }))
          setErrors((e) => ({ ...e, [key]: '' }))
        }}
      />
      <div className="mt-auto flex items-center gap-inline pt-actions">
        <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        {onCancel && <Button variant="secondary" onClick={onCancel}>Cancel</Button>}
      </div>
    </form>
  )
}
