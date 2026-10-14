import { cn } from '@/lib/cn'
import { focusLink } from '@/components/ui/styles'
import Link from 'next/link'
import { LegalLinks } from './LegalLinks'
import { Wordmark } from './Wordmark'

const VISITOR_LINKS = [
  { href: '/login', label: 'Log in' },
  { href: '/signup', label: 'Sign up' },
]
// Signed in, the log in and sign up pages lead nowhere (they send you back home): the pages of the app instead.
const MEMBER_LINKS = [
  { href: '/jobs', label: 'Jobs' },
  { href: '/resume', label: 'Resume' },
  { href: '/account', label: 'Account' },
]

const linkClass = cn(
  'inline-flex min-h-10 items-center rounded-control underline-offset-4 hover:underline',
  focusLink,
)

/** Footer of the pages: for a visitor, the way in; for someone signed in, the pages of the app. */
export function SiteFooter({ signedIn = false }: { signedIn?: boolean }) {
  const links = signedIn ? MEMBER_LINKS : VISITOR_LINKS
  return (
    <footer className="border-t-2 border-ink bg-canvas px-4 py-5 md:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-1.5">
          <Wordmark />
          <p className="text-sm text-ink-muted">
            <span className="font-extrabold tracking-tight text-ink">One job. One resume. Three clicks.</span>{' '}
            Free, not for profit, hosted in France. Built by Quentin Rebergue.
          </p>
        </div>
        <nav aria-label="Footer">
          <ul className="flex flex-wrap gap-x-5 font-semibold">
            {links.map((link) => (
              <li key={link.href}><Link href={link.href} className={linkClass}>{link.label}</Link></li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="mx-auto mt-3 flex w-full max-w-7xl flex-col gap-1 border-t border-line pt-2 text-sm text-ink-muted sm:flex-row sm:items-center sm:justify-between">
        <p>© 2026 FastResume · Hosted on OVHcloud in France</p>
        <LegalLinks />
      </div>
    </footer>
  )
}
