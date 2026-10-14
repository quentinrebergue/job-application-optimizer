'use client'

// A panel that slides up from the bottom, for a short decision (confirm a
// reset…). Built on Base UI (focus, Escape, swipe down to close), adapted from
// https://www.neobrutalism.dev/docs/drawer (MIT) and styled with our tokens.

import { Drawer as DrawerPrimitive } from '@base-ui/react/drawer'
import { cn } from '@/lib/cn'

export function Drawer(props: React.ComponentProps<typeof DrawerPrimitive.Root>) {
  return <DrawerPrimitive.Root swipeDirection="down" {...props} />
}

export const DrawerClose = DrawerPrimitive.Close

export function DrawerContent({ className, children, ...props }: React.ComponentProps<typeof DrawerPrimitive.Popup>) {
  return (
    <DrawerPrimitive.Portal>
      <DrawerPrimitive.Backdrop
        className={cn(
          'fixed inset-0 z-50 bg-ink/60 transition-opacity duration-300',
          'data-starting-style:opacity-0 data-ending-style:opacity-0 motion-reduce:transition-none',
        )}
      />
      <DrawerPrimitive.Viewport className="pointer-events-none fixed inset-0 z-50 flex items-end justify-center">
        <DrawerPrimitive.Popup
          className={cn(
            'pointer-events-auto w-full rounded-t-control border-2 border-b-0 border-ink bg-panel p-6 text-ink outline-none',
            'pb-[max(1.5rem,env(safe-area-inset-bottom))]',
            // Follows the finger while swiping, slides in and out otherwise.
            'translate-y-(--drawer-swipe-movement-y,0px) transition-transform duration-300',
            'data-starting-style:translate-y-full data-ending-style:translate-y-full data-swiping:transition-none motion-reduce:transition-none',
            className,
          )}
          {...props}
        >
          {/* Full width; the content stays in a readable centred column. */}
          <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
            <div aria-hidden="true" className="mx-auto h-1.5 w-16 shrink-0 rounded-full bg-ink" />
            {children}
          </div>
        </DrawerPrimitive.Popup>
      </DrawerPrimitive.Viewport>
    </DrawerPrimitive.Portal>
  )
}

export function DrawerTitle({ className, ...props }: React.ComponentProps<typeof DrawerPrimitive.Title>) {
  return <DrawerPrimitive.Title className={cn('text-xl font-extrabold tracking-tight', className)} {...props} />
}

export function DrawerDescription({ className, ...props }: React.ComponentProps<typeof DrawerPrimitive.Description>) {
  return <DrawerPrimitive.Description className={cn('text-sm text-ink-muted', className)} {...props} />
}

export function DrawerFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('mt-2 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end', className)} {...props} />
}
