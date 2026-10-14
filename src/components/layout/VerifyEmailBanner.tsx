import { ResendVerificationButton } from '@/components/auth/ResendVerificationButton'
import { cn } from '@/lib/cn'
import { pageFrame } from '@/components/ui/styles'

/** Under the top bar while the address is not confirmed: why it matters, and a way to get the mail again. */
export function VerifyEmailBanner({ email }: { email: string }) {
  return (
    <div className="border-b-2 border-ink bg-warning">
      <div className={cn(pageFrame, 'flex flex-col gap-2 py-bar md:flex-row md:items-center md:justify-between')}>
        <p className="text-small">
          <span className="font-semibold">Confirm your email address.</span>{' '}
          We sent a link to <span className="font-semibold break-all">{email}</span>. The AI ranking unlocks once it is confirmed.
        </p>
        <ResendVerificationButton className="shrink-0" />
      </div>
    </div>
  )
}
