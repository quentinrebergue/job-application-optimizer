'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ENABLED_MODULES } from '@/config'
import { Wordmark } from './Wordmark'
import { LogoutButton } from './LogoutButton'
import { isActiveModule } from './nav'

// The app's only navigation, at every width: name, module links, account.
export function AppHeader({ userEmail }: { userEmail: string | null }) {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas">
      <div className="flex h-14 items-center gap-6 px-4 md:px-8">
        <Wordmark />

        <nav aria-label="Main" className="flex h-full items-stretch gap-5">
          {ENABLED_MODULES.map((mod) => {
            const isActive = isActiveModule(pathname, mod)
            return (
              <Link
                key={mod.id}
                href={mod.href}
                aria-current={isActive ? 'page' : undefined}
                className={[
                  'flex items-center border-b-2 pt-0.5 text-sm transition-colors',
                  'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent-strong',
                  isActive
                    ? 'border-accent font-semibold text-ink'
                    : 'border-transparent text-ink-muted hover:text-ink',
                ].join(' ')}
              >
                {mod.label}
              </Link>
            )
          })}
        </nav>

        <div className="ml-auto flex min-w-0 items-center gap-4">
          {userEmail ? (
            <>
              <span className="hidden truncate font-mono text-xs text-ink-muted md:inline" title={userEmail}>
                {userEmail}
              </span>
              <LogoutButton />
            </>
          ) : (
            <Link href="/login" className="text-xs text-accent-strong hover:underline">Log in</Link>
          )}
        </div>
      </div>
    </header>
  )
}
