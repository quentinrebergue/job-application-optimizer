'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { forgotPassword } from '@/app/actions/password-reset'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'

const linkClass = 'font-semibold text-accent-strong underline underline-offset-4'

/** Asks for the address; the answer is the same whether an account exists or not. */
export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(forgotPassword, undefined)

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <Card className="w-full max-w-sm p-6">
        <h1 className="mb-2 text-2xl font-extrabold tracking-tight">Forgot your password?</h1>
        {state?.sent ? (
          <div className="flex flex-col gap-4">
            <Alert variant="success">
              If an account exists for {state.email}, we sent it a link to choose a new password. It is valid for 30 minutes.
            </Alert>
            <p className="text-sm text-ink-muted">No mail after a few minutes? Check the spam folder, or ask again in a minute.</p>
            <Link href="/login" className={linkClass}>Back to log in</Link>
          </div>
        ) : (
          <>
            <p className="mb-6 text-sm text-ink-muted">Enter the address of your account: we will mail you a link to choose a new password.</p>
            <form action={action} className="flex flex-col gap-4">
              <Field label="Email">
                {/* React 19 resets the form after the action: the email comes back in the state (#68). */}
                <Input key={state?.email} name="email" type="email" autoComplete="email" required defaultValue={state?.email} />
              </Field>
              {state?.error && <Alert>{state.error}</Alert>}
              <Button type="submit" disabled={pending} className="mt-2 w-full">
                {pending ? 'Sending…' : 'Send the link'}
              </Button>
            </form>
            <p className="mt-6 text-sm text-ink-muted">
              Remembered it? <Link href="/login" className={linkClass}>Log in</Link>
            </p>
          </>
        )}
      </Card>
    </div>
  )
}
