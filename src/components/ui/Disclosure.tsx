'use client'

import { useId, useState } from 'react'
import { cn } from '@/lib/cn'
import { focusRing } from './styles'

interface DisclosureProps {
  title: string
  /** Shown after the title, in tabular figures (e.g. a count) */
  meta?: string
  defaultOpen?: boolean
  className?: string
  children: React.ReactNode
}

/**
 * A titled section that opens and closes. The button sits inside the heading
 * (not the reverse) and announces its state with aria-expanded.
 */
export function Disclosure({ title, meta, defaultOpen = false, className, children }: DisclosureProps) {
  const [open, setOpen] = useState(defaultOpen)
  const panelId = useId()

  return (
    <section className={cn('border-t-2 border-ink pt-stack', className)}>
      <h2>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
          className={cn('flex w-full items-center justify-between gap-inline rounded-control text-left', focusRing)}
        >
          <span className="text-section">
            {title}
            {meta && <span className="ml-2 text-small font-normal tabular-nums text-ink-muted">{meta}</span>}
          </span>
          <span
            aria-hidden="true"
            className="flex size-8 shrink-0 items-center justify-center rounded-control border-2 border-ink bg-surface text-lg font-semibold"
          >
            {open ? '−' : '+'}
          </span>
        </button>
      </h2>
      {/* Children mount only when open: closed panels do not fetch or autosave. */}
      <div id={panelId} hidden={!open} className="mt-heading">
        {open && children}
      </div>
    </section>
  )
}
