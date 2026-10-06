import Link from 'next/link'
import { ResendVerificationButton } from '@/components/auth/ResendVerificationButton'
import { buttonClasses } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { getCurrentUser } from '@/lib/auth/dal'

export const metadata = { title: 'Confirm your email' }

const MESSAGES = {
  confirmed: { title: 'Email confirmed', text: 'Your address is confirmed. The AI ranking is unlocked.' },
  used: { title: 'Link already used', text: 'This link was already used: your address is probably confirmed already.' },
  expired: { title: 'Link expired', text: 'This link is more than 24 hours old. Ask for a new one.' },
  invalid: { title: 'Link not valid', text: 'This link is not valid. Open the latest mail we sent you, or ask for a new one.' },
} as const

type Status = keyof typeof MESSAGES

function parseStatus(value: string | string[] | undefined): Status {
  return typeof value === 'string' && value in MESSAGES ? (value as Status) : 'invalid'
}

/** Where the link of the confirmation mail lands (after /verify-email/confirm). */
export default async function VerifyEmailPage({ searchParams }: PageProps<'/verify-email'>) {
  const status = parseStatus((await searchParams).status)
  const { title, text } = MESSAGES[status]
  const user = await getCurrentUser()
  const canResend = user !== null && !user.emailVerified && status !== 'confirmed'

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <Card className="flex w-full max-w-sm flex-col gap-4 p-6">
        <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
        <p className="text-sm">{text}</p>
        {canResend && <ResendVerificationButton />}
        {user ? (
          <Link href="/jobs" className={buttonClasses({ className: 'self-start' })}>Go to my jobs</Link>
        ) : (
          <Link href="/login" className={buttonClasses({ className: 'self-start' })}>
            {status === 'confirmed' ? 'Log in' : 'Log in to get a new link'}
          </Link>
        )}
      </Card>
    </div>
  )
}
