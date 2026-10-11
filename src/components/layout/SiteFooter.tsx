import { cn } from '@/lib/cn'
import { focusLink } from '@/components/ui/styles'
import Link from 'next/link'
import { LegalLinks } from './LegalLinks'
import { Wordmark } from './Wordmark'

const LINKS = [
  { href: '/login', label: 'Log in' },
  { href: '/signup', label: 'Sign up' },
]

const linkClass = cn(
  'inline-flex min-h-10 items-center rounded-control underline-offset-4 hover:underline',
  focusLink,
)

/** Footer of the pages a visitor sees before signing in. */
export function SiteFooter() {
  return (
    <footer className="border-t-2 border-ink bg-canvas px-4 py-10 md:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 md:flex-row md:items-start md:justify-between">
        <div className="flex max-w-sm flex-col gap-3">
          <Wordmark />
          <p className="font-extrabold tracking-tight">One job. One resume. Three clicks.</p>
          <p className="text-sm text-ink-muted">Free, not for profit, hosted in France. Built by Quentin Rebergue.</p>
        </div>
        <nav aria-label="Footer">
          <ul className="flex flex-col font-semibold">
            {LINKS.map((link) => (
              <li key={link.href}><Link href={link.href} className={linkClass}>{link.label}</Link></li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="mx-auto mt-8 flex w-full max-w-7xl flex-col gap-2 border-t border-line pt-4 text-sm text-ink-muted sm:flex-row sm:items-center sm:justify-between">
        <p>© 2026 FastResume · Hosted on OVHcloud in France</p>
        <LegalLinks />
      </div>
    </footer>
  )
}
