'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { setNewPassword } from '@/app/actions/password-reset'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'

/** The new password, for a valid reset link; the token is used only on submit. */
export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(setNewPassword, undefined)

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <Card className="w-full max-w-sm p-6">
        <h1 className="mb-2 text-2xl font-extrabold tracking-tight">Choose a new password</h1>
        <p className="mb-6 text-sm text-ink-muted">You will be signed out of every other device.</p>
        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="token" value={token} />
          <Field label="New password" hint="At least 8 characters, with a letter and a digit." error={state?.errors?.join(' ')}>
            <Input name="password" type="password" autoComplete="new-password" required />
          </Field>
          {state?.message && (
            <Alert>
              {state.message}{' '}
              <Link href="/forgot-password" className="underline underline-offset-4">Ask for a new link</Link>
            </Alert>
          )}
          <Button type="submit" disabled={pending} className="mt-2 w-full">
            {pending ? 'Saving…' : 'Save the new password'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
