import type { Metadata } from 'next'
import Link from 'next/link'
import { StatusPage } from '@/components/layout/StatusPage'
import { Wordmark } from '@/components/layout/Wordmark'
import { buttonClasses } from '@/components/ui/Button'
import { pageWidth } from '@/components/ui/styles'
import { cn } from '@/lib/cn'

export const metadata: Metadata = { title: 'Page not found' }

// An address that matches no page. It has no shell of the two layouts (the root layout only holds the
// document), so it brings the name and a way back. A page that calls notFound() inside the app shows
// (app)/not-found.tsx instead, with the app's bar.
export default function NotFound() {
  return (
    <>
      <header className="border-b-2 border-ink">
        <div className={cn(pageWidth, 'flex h-16 items-center px-3 sm:px-4 md:px-8')}>
          <Wordmark />
        </div>
      </header>
      <main>
        <StatusPage
          code="404"
          title="Page not found"
          actions={<Link href="/" className={buttonClasses()}>Go to the home page</Link>}
        >
          This address leads nowhere. The link may be old, or mistyped.
        </StatusPage>
      </main>
    </>
  )
}
