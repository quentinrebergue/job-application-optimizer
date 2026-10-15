import { cn } from '@/lib/cn'
import { focusLink, pageFrame } from '@/components/ui/styles'
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
    <footer className="border-t-2 border-ink bg-canvas py-footer">
      <div className={cn(pageFrame, 'flex flex-col gap-inline md:flex-row md:items-center md:justify-between')}>
        <div className="flex flex-col gap-1.5">
          <Wordmark />
          <p className="text-small text-ink-muted">
            <span className="font-extrabold tracking-tight text-ink">One job. One resume. Three clicks.</span>{' '}
            Free, not for profit, hosted in France. Built by Quentin Rebergue.
          </p>
        </div>
        <nav aria-label="Footer">
          <ul className="flex flex-wrap gap-x-links font-semibold">
            {links.map((link) => (
              <li key={link.href}><Link href={link.href} className={linkClass}>{link.label}</Link></li>
            ))}
          </ul>
        </nav>
      </div>
      <div className={cn(pageFrame, 'mt-inline flex flex-col gap-1 border-t border-line pt-2 text-small text-ink-muted sm:flex-row sm:items-center sm:justify-between')}>
        <p>© 2026 FastResume · Hosted on OVHcloud in France</p>
        <LegalLinks />
      </div>
    </footer>
  )
}
