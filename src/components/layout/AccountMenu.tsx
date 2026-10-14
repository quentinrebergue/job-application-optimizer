'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { Menu } from '@base-ui/react/menu'
import { logout } from '@/app/actions/auth'
import { cn } from '@/lib/cn'
import { focusRing, pressable } from '@/components/ui/styles'

/**
 * The account: a square with the user's initial that opens a small menu with
 * the email, "Account" (data export and deletion) and "Log out". Base UI handles the
 * keyboard, focus and screen readers.
 */
export function AccountMenu({ email }: { email: string }) {
  const [pending, startTransition] = useTransition()
  const initial = email.trim().charAt(0).toUpperCase() || '?'

  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label={`Account (${email})`}
        className={cn(
          'flex size-9 items-center justify-center rounded-control border-2 border-ink bg-surface text-body font-extrabold text-ink',
          pressable,
          'data-popup-open:translate-x-press data-popup-open:translate-y-press data-popup-open:shadow-none',
          focusRing,
        )}
      >
        {initial}
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner side="bottom" align="end" sideOffset={8} className="isolate z-50">
          <Menu.Popup className="min-w-56 max-w-[calc(100vw-2rem)] rounded-control border-2 border-ink bg-surface p-1 text-ink shadow-hard outline-none">
            <div className="border-b-2 border-ink px-control pb-2 pt-1.5">
              <p className="text-caption text-ink-muted">Signed in as</p>
              <p className="text-small-strong truncate" title={email}>{email}</p>
            </div>
            <Menu.LinkItem
              render={<Link href="/account" />}
              className={cn(
                'mt-1 flex cursor-default items-center rounded-control border-2 border-transparent px-control py-1.5 text-small outline-none',
                'data-highlighted:border-ink data-highlighted:bg-accent',
              )}
            >
              Account
            </Menu.LinkItem>
            <Menu.Item
              disabled={pending}
              onClick={() => startTransition(() => logout())}
              className={cn(
                'flex cursor-default items-center rounded-control border-2 border-transparent px-control py-1.5 text-small outline-none',
                'data-highlighted:border-ink data-highlighted:bg-accent data-disabled:opacity-50',
              )}
            >
              {pending ? 'Logging out…' : 'Log out'}
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}
