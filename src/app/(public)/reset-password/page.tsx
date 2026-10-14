import Link from 'next/link'
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm'
import { buttonClasses } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { checkResetToken } from '@/lib/auth/password-reset'

export const metadata = { title: 'Reset password' }

const REFUSED = {
  invalid: { title: 'Link not valid', text: 'This reset link is not valid. Open the latest mail we sent you, or ask for a new link.' },
  used: { title: 'Link already used', text: 'This reset link was already used. Ask for a new one if you still need to change your password.' },
  expired: { title: 'Link expired', text: 'Reset links are valid for 30 minutes. Ask for a new one.' },
} as const

/** Where the reset mail lands. Opening it does not use the link: only saving the new password does. */
export default async function ResetPasswordPage({ searchParams }: PageProps<'/reset-password'>) {
  const raw = (await searchParams).token
  const token = typeof raw === 'string' ? raw : null
  const status = await checkResetToken(token)

  if (status === 'valid' && token) return <ResetPasswordForm token={token} />

  const { title, text } = REFUSED[status === 'valid' ? 'invalid' : status]
  return (
    <div className="flex flex-1 items-center justify-center px-gutter py-centered">
      <Card className="flex w-full max-w-sm flex-col gap-stack p-panel">
        <h1 className="text-heading">{title}</h1>
        <p className="text-small">{text}</p>
        <Link href="/forgot-password" className={buttonClasses({ className: 'self-start' })}>Ask for a new link</Link>
      </Card>
    </div>
  )
}
