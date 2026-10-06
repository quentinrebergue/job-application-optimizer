import Link from 'next/link'
import { Logo } from './Logo'

// App name with its mark (the F-bolt). The name is text, so it follows the tokens.
export function Wordmark() {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-2 rounded-control text-base font-extrabold tracking-tight text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-strong"
    >
      <Logo className="size-7" />
      FastResume
    </Link>
  )
}
