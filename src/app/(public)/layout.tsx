import Link from 'next/link'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { Wordmark } from '@/components/layout/Wordmark'
import { buttonClasses } from '@/components/ui/Button'
import { pageFrame } from '@/components/ui/styles'
import { cn } from '@/lib/cn'

// Shell of the pages a visitor sees before signing in: the same bar as the app
// (it stays on top when scrolling), with the name and the two ways in.
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-control focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:text-ink focus:outline-2 focus:outline-accent-strong"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b-2 border-ink bg-canvas">
        <div className={cn(pageFrame, 'flex h-16 items-center justify-between gap-nav')}>
          <Wordmark />
          <nav aria-label="Account" className="flex items-center gap-inline">
            <Link href="/login" className={buttonClasses({ variant: 'secondary' })}>Log in</Link>
            <Link href="/signup" className={buttonClasses()}>Sign up</Link>
          </nav>
        </div>
      </header>
      <main id="main" className="flex flex-1 flex-col">{children}</main>
      <SiteFooter />
    </div>
  )
}
