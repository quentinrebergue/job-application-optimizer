import Link from 'next/link'

// App name with its red mark. Text, not an image, so it follows the tokens.
export function Wordmark() {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-2 rounded-control text-base font-extrabold tracking-tight text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-strong"
    >
      <span aria-hidden="true" className="size-4 rounded-xs border-2 border-ink bg-accent" />
      FastResume
    </Link>
  )
}
