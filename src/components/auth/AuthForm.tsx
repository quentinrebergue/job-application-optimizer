'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { login, signup } from '@/app/actions/auth'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'

const MODES = {
  login: {
    action: login,
    title: 'Log in',
    submit: 'Log in',
    pending: 'Logging in…',
    passwordAutoComplete: 'current-password',
    switchText: 'No account yet?',
    switchLabel: 'Sign up',
    switchPath: '/signup',
  },
  signup: {
    action: signup,
    title: 'Create an account',
    submit: 'Create account',
    pending: 'Creating…',
    passwordAutoComplete: 'new-password',
    switchText: 'Already have an account?',
    switchLabel: 'Log in',
    switchPath: '/login',
  },
} as const

interface AuthFormProps {
  mode: keyof typeof MODES
  /** Page to land on afterwards */
  returnTo: string
  /** Current query, kept when switching between login and signup */
  query: string
}

export function AuthForm({ mode, returnTo, query }: AuthFormProps) {
  const config = MODES[mode]
  const [state, action, pending] = useActionState(config.action, undefined)

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <Card className="w-full max-w-sm p-6">
        <h1 className="mb-6 text-2xl font-extrabold tracking-tight">{config.title}</h1>
        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="returnTo" value={returnTo} />
          <Field label="Email" error={state?.errors?.email?.[0]}>
            {/* React 19 resets the form after the action: the email comes back in the state (#68). */}
            <Input
              key={state?.email}
              name="email"
              type="email"
              autoComplete="email"
              required
              defaultValue={state?.email}
            />
          </Field>
          <Field label="Password" error={state?.errors?.password?.join(' ')}>
            <Input name="password" type="password" autoComplete={config.passwordAutoComplete} required />
          </Field>
          {mode === 'login' && (
            <Link href="/forgot-password" className="-mt-2 self-end text-sm font-semibold text-accent-strong underline underline-offset-4">
              Forgot password?
            </Link>
          )}
          {state?.message && (
            <Alert>{state.message}</Alert>
          )}
          <Button type="submit" disabled={pending} className="mt-2 w-full">
            {pending ? config.pending : config.submit}
          </Button>
        </form>
        <p className="mt-6 text-sm text-ink-muted">
          {config.switchText}{' '}
          <Link
            href={query ? `${config.switchPath}?${query}` : config.switchPath}
            className="font-semibold text-accent-strong underline underline-offset-4"
          >
            {config.switchLabel}
          </Link>
        </p>
      </Card>
    </div>
  )
}
