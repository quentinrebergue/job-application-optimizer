'use client'

import { createContext, useContext, useId } from 'react'
import { cn } from '@/lib/cn'

interface FieldContextValue {
  id: string
  describedBy?: string
  invalid: boolean
}

const FieldContext = createContext<FieldContextValue | null>(null)

/** Ids and state of the enclosing <Field>, read by Input, Textarea and Select. */
export function useField(): FieldContextValue | null {
  return useContext(FieldContext)
}

interface FieldProps {
  label: string
  /** Shown under the control and announced with it */
  hint?: string
  /** Replaces the hint; the control is marked invalid and the message is announced */
  error?: string
  className?: string
  children: React.ReactNode
}

/** Label, control and message, tied together for screen readers. */
export function Field({ label, hint, error, className, children }: FieldProps) {
  const id = useId()
  const messageId = `${id}-message`
  const message = error ?? hint

  return (
    <FieldContext.Provider value={{ id, describedBy: message ? messageId : undefined, invalid: Boolean(error) }}>
      <div className={cn('flex flex-col gap-1', className)}>
        <label htmlFor={id} className="text-xs font-semibold text-ink">
          {label}
        </label>
        {children}
        {message && (
          <p
            id={messageId}
            role={error ? 'alert' : undefined}
            className={cn('text-xs', error ? 'text-danger' : 'text-ink-muted')}
          >
            {message}
          </p>
        )}
      </div>
    </FieldContext.Provider>
  )
}
