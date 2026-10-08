'use client'

import { Popover } from '@base-ui/react/popover'
import { Info } from 'lucide-react'
import { cn } from '@/lib/cn'
import { focusRing } from './styles'

/**
 * A small "i" that opens a short note: on hover, on keyboard focus and on tap
 * (a plain hover tooltip would not open on a phone). Closes with Escape or a
 * click elsewhere. For one or two sentences, never for something needed to use the page.
 */
export function InfoTip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Popover.Root>
      <Popover.Trigger
        openOnHover
        delay={120}
        closeDelay={80}
        aria-label={label}
        className={cn(
          'ml-1.5 inline-flex size-5 shrink-0 translate-y-0.5 items-center justify-center rounded-control border-2 border-ink bg-surface text-ink',
          'transition-colors hover:bg-accent data-[popup-open]:bg-accent',
          focusRing,
        )}
      >
        <Info size={12} strokeWidth={3} aria-hidden="true" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="top" sideOffset={8} collisionPadding={12} className="z-50">
          <Popover.Popup className="max-w-[min(18rem,calc(100vw-2rem))] rounded-control border-2 border-ink bg-surface px-3 py-2 text-sm font-normal text-ink shadow-hard">
            {children}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}
