'use client'

import { cn } from '@/lib/cn'
import { useField } from './Field'

// Controls stay white (surface) on the cream page so it is clear where to type.
export const controlClasses = cn(
  'w-full rounded-control border border-line bg-surface px-3 text-sm text-ink placeholder:text-ink-muted',
  'transition-colors hover:border-ink-muted',
  'focus-visible:border-accent-strong focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent-strong/30',
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

export function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return <textarea className={cn(controlClasses, 'min-h-24 py-2 leading-relaxed', className)} {...useFieldProps(props)} />
}

export function Select({ className, ...props }: React.ComponentProps<'select'>) {
  return <select className={cn(controlClasses, 'h-10 pr-8', className)} {...useFieldProps(props)} />
}
