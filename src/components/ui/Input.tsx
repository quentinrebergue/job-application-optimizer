'use client'

import { useLayoutEffect, useRef } from 'react'
import { cn } from '@/lib/cn'
import { useField } from './Field'

// White controls with the ink stroke; the hard shadow appears while typing.
export const controlClasses = cn(
  'w-full rounded-control border-2 border-ink bg-surface px-3 text-sm text-ink placeholder:text-ink-muted',
  'transition-shadow focus-visible:shadow-hard focus-visible:outline-none',
  'aria-invalid:border-danger disabled:opacity-50',
)

/** Props that tie a control to its <Field>; explicit props win. */
export function useFieldProps<P extends { id?: string; 'aria-describedby'?: string; 'aria-invalid'?: React.AriaAttributes['aria-invalid'] }>(props: P): P {
  const field = useField()
  if (!field) return props
  return {
    ...props,
    id: props.id ?? field.id,
    'aria-describedby': props['aria-describedby'] ?? field.describedBy,
    'aria-invalid': props['aria-invalid'] ?? (field.invalid || undefined),
  }
}

export function Input({ className, ...props }: React.ComponentProps<'input'>) {
  return <input className={cn(controlClasses, 'h-10', className)} {...useFieldProps(props)} />
}

interface TextareaProps extends React.ComponentProps<'textarea'> {
  /** Grows with its content instead of scrolling inside */
  autoGrow?: boolean
}

export function Textarea({ className, autoGrow, ...props }: TextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null)

  // Fit the height to the text when it changes, and when the width changes
  // (a narrower window wraps the text onto more lines).
  useLayoutEffect(() => {
    const el = ref.current
    if (!autoGrow || !el) return
    const fit = () => {
      el.style.height = 'auto'
      el.style.height = `${el.scrollHeight + 4}px` // + the 2px borders
    }
    fit()
    let width = el.clientWidth
    const observer = new ResizeObserver(() => {
      if (el.clientWidth === width) return // our own height change, not a new width
      width = el.clientWidth
      fit()
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [autoGrow, props.value])

  return (
    <textarea
      ref={ref}
      className={cn(controlClasses, 'min-h-24 py-2 leading-relaxed', autoGrow && 'resize-none overflow-hidden', className)}
      {...useFieldProps(props)}
    />
  )
}

export function Select({ className, ...props }: React.ComponentProps<'select'>) {
  return <select className={cn(controlClasses, 'h-10 pr-8', className)} {...useFieldProps(props)} />
}
