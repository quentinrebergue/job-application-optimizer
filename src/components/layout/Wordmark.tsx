import { cn } from '@/lib/cn'
import { focusLink } from '@/components/ui/styles'
import Link from 'next/link'
import { Logo } from './Logo'

// App name with its mark (the F-bolt). The name is text, so it follows the tokens.
// `markOnPhone`: in the top bar of a phone only the mark is drawn (the name stays for screen readers).
export function Wordmark({ markOnPhone = false }: { markOnPhone?: boolean }) {
  return (
    <Link
      href="/"
      aria-label={markOnPhone ? 'FastResume' : undefined}
      className={cn('inline-flex items-center gap-2 rounded-control text-base font-extrabold tracking-tight text-ink', focusLink)}
    >
      <Logo className="size-7" />
      <span className={markOnPhone ? 'max-md:sr-only' : undefined}>FastResume</span>
    </Link>
  )
}
