'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SECTIONS } from '@/config'
import { buttonClasses } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { focusRing, pageWidth } from '@/components/ui/styles'
import { AccountMenu } from './AccountMenu'
import { Wordmark } from './Wordmark'
import { isActiveSection } from './nav'

/**
 * The app's only navigation, at every width: name, sections, account.
 * Sections are places, not actions: plain text, the current one in extra-bold
 * ink, the others regular and muted. Same size as the wordmark so their text
 * sits on one line; a full-height stroke separates the name from the sections.
 */
export function AppHeader({ userEmail }: { userEmail: string | null }) {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-40 border-y-2 border-ink bg-canvas">
      <div className={cn(pageWidth, 'flex h-16 items-center gap-4 px-3 sm:gap-6 sm:px-4 md:px-8')}>
        {/* The name sits in its own cell, closed by a full-height stroke: it is not a section. */}
        <div className="flex self-stretch items-center border-r-2 border-ink pr-4 sm:pr-6">
          <Wordmark />
        </div>

        <nav aria-label="Main" className="flex items-center gap-1 sm:gap-2">
          {SECTIONS.map((section) => {
            const isActive = isActiveSection(pathname, section)
            return (
              <Link
                key={section.id}
                href={section.href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'rounded-control px-2 py-1 text-base transition-colors sm:px-3',
                  focusRing,
                  isActive ? 'font-extrabold text-ink' : 'font-normal text-ink-muted hover:text-ink',
                )}
              >
                {section.label}
              </Link>
            )
          })}
        </nav>

        <div className="ml-auto flex items-center pr-1">
          {userEmail ? (
            <AccountMenu email={userEmail} />
          ) : (
            <Link href="/login" className={buttonClasses({ variant: 'secondary', size: 'sm' })}>Log in</Link>
          )}
        </div>
      </div>
    </header>
  )
}
