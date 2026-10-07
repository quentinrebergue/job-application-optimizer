'use server'

import * as z from 'zod'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { requestPasswordReset, resetPassword } from '@/lib/auth/password-reset'
import { createSession } from '@/lib/auth/session'
import { clientIp } from '@/lib/rate-limit'
import { SignupSchema } from '@/lib/validation/auth-schemas'

export type ForgotPasswordState =
  | { sent: true; email: string }
  | { sent?: false; email?: string; error?: string }
  | undefined

const EmailSchema = SignupSchema.shape.email

/** "Forgot password?": same answer whether the account exists or not. */
export async function forgotPassword(_prev: ForgotPasswordState, formData: FormData): Promise<ForgotPasswordState> {
  const raw = formData.get('email')
  const email = EmailSchema.safeParse(raw)
  if (!email.success) {
    return { email: typeof raw === 'string' ? raw : '', error: 'Enter a valid email address.' }
  }
  const result = await requestPasswordReset(email.data, clientIp(await headers()))
  if (result === 'too-many') {
    return { email: email.data, error: 'Too many requests from your network. Try again in an hour.' }
  }
  return { sent: true, email: email.data }
}

export type ResetPasswordState = { errors?: string[]; message?: string } | undefined

const FAILURES = {
  invalid: 'This link is not valid. Ask for a new one.',
  used: 'This link was already used. Ask for a new one if you still need it.',
  expired: 'This link is more than 30 minutes old. Ask for a new one.',
} as const

/** The form of the reset link: the token is used here, not when the page opens. */
export async function setNewPassword(_prev: ResetPasswordState, formData: FormData): Promise<ResetPasswordState> {
  const token = formData.get('token')
  const password = SignupSchema.shape.password.safeParse(formData.get('password'))
  if (!password.success) return { errors: z.flattenError(password.error).formErrors }
  if (typeof token !== 'string' || !token) return { message: FAILURES.invalid }

  const result = await resetPassword(token, password.data)
  if ('failure' in result) return { message: FAILURES[result.failure] }

  await createSession(result.userId)
  redirect('/jobs')
}
