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
  /** A long text: how much of its limit is used, shown under the control (red once over) */
  count?: { used: number; max: number }
  className?: string
  children: React.ReactNode
}

/** Label, control and message, tied together for screen readers. */
export function Field({ label, hint, error, count, className, children }: FieldProps) {
  const id = useId()
  const messageId = `${id}-message`
  const message = error ?? hint

  return (
    <FieldContext.Provider value={{ id, describedBy: message ? messageId : undefined, invalid: Boolean(error) }}>
      <div className={cn('flex flex-col gap-label', className)}>
        <label htmlFor={id} className="text-label text-ink">
          {label}
        </label>
        {children}
        {(message || count) && (
          <div className="flex items-start justify-between gap-inline text-caption">
            {message ? (
              <p id={messageId} role={error ? 'alert' : undefined} className={error ? 'text-danger' : 'text-ink-muted'}>
                {message}
              </p>
            ) : <span />}
            {count && (
              <span className={cn('shrink-0 tabular-nums', count.used > count.max ? 'font-semibold text-danger' : 'text-ink-muted')}>
                {count.used.toLocaleString('en-US')} / {count.max.toLocaleString('en-US')}
              </span>
            )}
          </div>
        )}
      </div>
    </FieldContext.Provider>
  )
}
