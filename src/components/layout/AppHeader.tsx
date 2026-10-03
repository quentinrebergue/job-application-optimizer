'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ENABLED_MODULES } from '@/config'
import { Wordmark } from './Wordmark'
import { LogoutButton } from './LogoutButton'
import { buttonClasses } from '@/components/ui/Button'
import { isActiveModule } from './nav'
import { cn } from '@/lib/cn'
import { focusRing } from '@/components/ui/styles'

// The app's only navigation, at every width: name, module links, account.
export function AppHeader({ userEmail }: { userEmail: string | null }) {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-40 border-b-2 border-ink bg-canvas">
      <div className="flex h-16 items-center gap-3 px-3 sm:gap-4 sm:px-4 md:gap-6 md:px-8">
        <Wordmark />

        <nav aria-label="Main" className="flex items-center gap-1.5 sm:gap-2">
          {ENABLED_MODULES.map((mod) => {
            const isActive = isActiveModule(pathname, mod)
            return (
              <Link
                key={mod.id}
                href={mod.href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'rounded-control border-2 border-ink px-2.5 py-1 text-sm sm:px-3 transition-[translate,box-shadow] duration-100',
                  focusRing,
                  isActive
                    ? 'bg-accent font-bold text-ink shadow-hard'
                    : 'bg-surface text-ink hover:translate-x-press hover:translate-y-press motion-reduce:hover:translate-x-0 motion-reduce:hover:translate-y-0',
                )}
              >
                {mod.label}
              </Link>
            )
          })}
        </nav>

        <div className="ml-auto flex min-w-0 items-center gap-4 pr-1">
          {userEmail ? (
            <>
              <span className="hidden truncate font-mono text-xs text-ink-muted lg:inline" title={userEmail}>
                {userEmail}
              </span>
              <LogoutButton />
            </>
          ) : (
            <Link href="/login" className={buttonClasses({ variant: 'secondary', size: 'sm' })}>Log in</Link>
          )}
        </div>
      </div>
    </header>
  )
}
