import { redirect } from 'next/navigation'
import { confirmEmailChangeAction } from '@/app/actions/email-change'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { peekEmailChangeToken } from '@/lib/data/email-tokens'

export const metadata = { title: 'Confirm your new email' }

/**
 * Where the mail sent to the NEW address lands (#236). Opening it changes nothing: the link is only read here,
 * and the address of the account changes when the button is clicked. A mail scanner that opens links in
 * advance cannot confirm anything.
 */
export default async function ChangeEmailPage({ searchParams }: PageProps<'/verify-email/change'>) {
  const raw = (await searchParams).token
  const token = typeof raw === 'string' ? raw : null
  const result = token ? await peekEmailChangeToken(token) : { failure: 'invalid' as const }
  // Used, expired or not valid: the page of /verify-email has the message.
  if ('failure' in result || !token) redirect(`/verify-email?status=${'failure' in result ? result.failure : 'invalid'}`)

  return (
    <div className="flex flex-1 items-center justify-center px-gutter py-centered">
      <Card className="flex w-full max-w-sm flex-col gap-stack p-panel">
        <h1 className="text-heading">Confirm your new email</h1>
        <p className="text-small">
          Make <strong className="break-all">{result.newEmail}</strong> the address of your FastResume account? You will log in with it.
        </p>
        <form action={confirmEmailChangeAction}>
          <input type="hidden" name="token" value={token} />
          <Button type="submit">Confirm new address</Button>
        </form>
      </Card>
    </div>
  )
}
