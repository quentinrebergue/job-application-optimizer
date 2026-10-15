'use server'

import * as z from 'zod'
import { after } from 'next/server'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createUser, findUserByEmail, type User } from '@/lib/data/users'
import { sendVerificationEmail } from '@/lib/auth/email-verification'
import { UNKNOWN_ACCOUNT_HASH, verifyPassword } from '@/lib/auth/password'
import { createSession, deleteSession } from '@/lib/auth/session'
import { SignupSchema, LoginSchema } from '@/lib/validation/auth-schemas'
import { safePath } from '@/lib/auth/return-to'
import { beginLoginAttempt, purgeExpiredLoginRecords } from '@/lib/auth/login-limit'
import { checkSignup } from '@/lib/auth/signup-limit'
import { deleteExpiredEmailTokens } from '@/lib/data/email-tokens'
import { BusyError } from '@/lib/concurrency'
import { clientIp, deleteExpiredRateLimits } from '@/lib/rate-limit'

// `email` is sent back on failure so the form can show it again: React 19 resets
// uncontrolled fields after an action (#68). The password is never sent back.
export type AuthFormState =
  | { errors?: { email?: string[]; password?: string[] }; message?: string; email?: string }
  | undefined

function submittedEmail(formData: FormData): string {
  const email = formData.get('email')
  return typeof email === 'string' ? email : ''
}

export async function signup(_prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const validated = SignupSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!validated.success) {
    return { errors: z.flattenError(validated.error).fieldErrors, email: submittedEmail(formData) }
  }

  const { email, password } = validated.data

  // Counted once the form is valid (a mistyped form is not a sign-up) and before anything is created (#210).
  const allowed = await checkSignup(clientIp(await headers()))
  if (!allowed.ok) return { message: allowed.message, email }
  after(() => Promise.all([deleteExpiredRateLimits(), deleteExpiredEmailTokens()]).catch(() => {}))

  let user: User
  try {
    user = await createUser(email, password)
    await createSession(user.id)
  } catch (err) {
    if (err instanceof BusyError) {
      // Refused for lack of room, no account made: it does not count against the address (a visitor told to try again
      // would otherwise use up the sign-ups of their hour on refusals).
      await allowed.giveBack()
      return { message: 'Sign-up is very busy right now. Try again in a moment.', email }
    }
    const isDuplicate = err instanceof Error && 'code' in err && err.code === '23505'
    return { message: isDuplicate ? 'This email is already registered.' : 'Something went wrong. Try again.', email }
  }

  // The account exists even if the mail fails: the banner offers to resend it.
  try {
    await sendVerificationEmail(user)
  } catch (err) {
    console.error('verification mail not sent at sign-up', err)
  }

  // The form posts the page to return to; checked again here, it comes from the client.
  redirect(safePath(formData.get('returnTo')))
}

export async function login(_prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const validated = LoginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!validated.success) {
    return { errors: z.flattenError(validated.error).fieldErrors, email: submittedEmail(formData) }
  }

  const { email, password } = validated.data

  // Counted before anything is checked against an account, and given back on a success (#225): see login-limit.ts.
  const attempt = await beginLoginAttempt(clientIp(await headers()), email)
  if (!attempt.ok) return { message: attempt.message, email }

  const user = await findUserByEmail(email)
  // The hash is checked for an unknown address too, so the answer takes as long either way (#225).
  let valid: boolean
  try {
    valid = await verifyPassword(password, user?.passwordHash ?? UNKNOWN_ACCOUNT_HASH)
  } catch (err) {
    if (!(err instanceof BusyError)) throw err
    // So many checks are waiting that this one is refused: no password was checked, so nothing counts against anyone.
    await attempt.finish('cancelled')
    return { message: 'Sign-in is very busy right now. Try again in a moment.', email }
  }

  if (!user || !valid) {
    await attempt.finish('failure')
    after(() => purgeExpiredLoginRecords().catch(() => {}))
    return { message: 'Wrong email or password.', email }
  }
  await attempt.finish('success')

  await createSession(user.id)
  redirect(safePath(formData.get('returnTo')))
}

export async function logout(): Promise<void> {
  await deleteSession()
  redirect('/login')
}
