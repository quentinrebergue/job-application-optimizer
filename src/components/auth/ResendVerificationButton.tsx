'use client'

import { useState, useTransition } from 'react'
import { resendVerification } from '@/app/actions/email-verification'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'

/** "Resend the email", with the result next to it (sent, or why not). */
export function ResendVerificationButton({ className }: { className?: string }) {
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  function resend() {
    startTransition(async () => {
      const res = await resendVerification()
      setResult(res.ok ? { ok: true, message: 'Sent. Check your inbox (and the spam folder).' } : res)
    })
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-x-inline gap-y-1', className)}>
      <Button size="sm" variant="secondary" onClick={resend} disabled={pending}>
        {pending ? 'Sending…' : 'Resend the email'}
      </Button>
      {result && (
        <span role="status" className={cn('text-small', result.ok ? 'font-semibold' : 'text-danger')}>
          {result.message}
        </span>
      )}
    </div>
  )
}
