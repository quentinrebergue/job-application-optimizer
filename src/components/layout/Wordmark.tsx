import { cn } from '@/lib/cn'
import { focusLink } from '@/components/ui/styles'
import Link from 'next/link'
import { Logo } from './Logo'

// App name with its mark (the F-bolt). The name is text, so it follows the tokens.
export function Wordmark() {
  return (
    <Link
      href="/"
      className={cn('inline-flex items-center gap-2 rounded-control text-base font-extrabold tracking-tight text-ink', focusLink)}
    >
      <Logo className="size-7" />
      FastResume
    </Link>
  )
}
