'use client'

import { useEffect, useId, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { focusRing } from './styles'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  className?: string
}

/**
 * Built on the native <dialog>: showModal() puts it above everything (top layer),
 * makes the page behind inert, moves focus in and closes on Escape.
 */
export function Modal({ open, onClose, title, children, className }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      // A click on the dialog element itself (not its content) is a click on the backdrop.
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      className={cn(
        'm-auto max-h-[90vh] w-[calc(100%-2rem)] max-w-5xl flex-col rounded-control border-2 border-ink bg-surface p-0 text-ink shadow-hard open:flex',
        'backdrop:bg-ink/60',
        className,
      )}
    >
      <div className="flex shrink-0 items-center justify-between gap-4 border-b-2 border-ink px-5 py-3">
        <h2 id={titleId} className="font-extrabold">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className={cn('rounded-control border-2 border-transparent p-1 text-ink transition-colors hover:border-ink', focusRing)}
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>
      <div className="flex-1 overflow-auto">{children}</div>
    </dialog>
  )
}
