import Link from 'next/link'
import { CONTACT_EMAIL } from '@/config/legal'
import { cn } from '@/lib/cn'

const LINKS = [
  { href: '/privacy', label: 'Privacy' },
  { href: '/legal', label: 'Legal notice' },
  { href: '/terms', label: 'Terms' },
] as const

const linkClass =
  'inline-flex min-h-10 items-center rounded-control underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-strong'

/** The pages every visitor and user can reach from the footer, and the contact address. */
export function LegalLinks({ className }: { className?: string }) {
  return (
    <nav aria-label="Legal" className={className}>
      <ul className={cn('flex flex-wrap gap-x-5')}>
        {LINKS.map((link) => (
          <li key={link.href}><Link href={link.href} className={linkClass}>{link.label}</Link></li>
        ))}
        <li><a href={`mailto:${CONTACT_EMAIL}`} className={linkClass}>Contact</a></li>
      </ul>
    </nav>
  )
}
