'use client'

// A select with a custom-styled list, built on Base UI (keyboard, focus and screen
// readers handled). Adapted from https://www.neobrutalism.dev/docs/select (MIT),
// styled with our tokens. For a plain form field, the native <Select> in Input.tsx
// is enough.

import { Select as SelectPrimitive } from '@base-ui/react/select'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/cn'
import { focusRing } from './styles'

export const SelectMenu = SelectPrimitive.Root

export function SelectMenuValue({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value className={cn('flex flex-1 items-center text-left', className)} {...props} />
}

export function SelectMenuTrigger({ className, children, ...props }: React.ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      className={cn(
        'flex h-10 items-center justify-between gap-2 rounded-control border-2 border-ink bg-surface px-3 text-sm font-semibold text-ink shadow-hard',
        'data-disabled:cursor-not-allowed data-disabled:opacity-50',
        focusRing,
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon render={<ChevronDown className="size-4 shrink-0" aria-hidden="true" />} />
    </SelectPrimitive.Trigger>
  )
}

export function SelectMenuContent({ className, children, ...props }: React.ComponentProps<typeof SelectPrimitive.Popup>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner side="bottom" sideOffset={6} align="start" alignItemWithTrigger={false} className="isolate z-50">
        <SelectPrimitive.Popup
          className={cn(
            'max-h-[min(24rem,var(--available-height))] min-w-(--anchor-width) overflow-y-auto rounded-control border-2 border-ink bg-surface text-ink shadow-hard outline-none',
            className,
          )}
          {...props}
        >
          <SelectPrimitive.List className="flex flex-col gap-0.5 p-1">{children}</SelectPrimitive.List>
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  )
}

export function SelectMenuItem({ className, children, ...props }: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      className={cn(
        'relative flex cursor-default select-none items-center rounded-control border-2 border-transparent py-1.5 pl-2 pr-8 text-sm outline-none',
        'data-highlighted:border-ink data-highlighted:bg-accent data-disabled:pointer-events-none data-disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText className="whitespace-nowrap">{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator render={<span className="absolute right-2 flex items-center" />}>
        <Check className="size-4" aria-hidden="true" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  )
}
