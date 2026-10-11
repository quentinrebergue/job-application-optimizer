import 'server-only'
import * as z from 'zod'
import { consumeEmailChangeToken, createEmailToken, invalidateEmailTokens, type TokenFailure } from '@/lib/data/email-tokens'
import { emailTaken, findPasswordHash, findUserById, replacePassword, updateEmail } from '@/lib/data/users'
import {
  noticeChangeEmailLink,
  noticeEmailAlreadyUsed,
  noticeEmailChanged,
  noticeEmailChangeRequested,
  noticePasswordChanged,
} from '@/lib/account-notice'
import { verifyPassword } from '@/lib/auth/password'
import { createSession } from '@/lib/auth/session'
import { appUrl } from '@/lib/email/providers'
import { envNumber } from '@/lib/env'
import { consumeRateLimit } from '@/lib/rate-limit'
import { SignupSchema } from '@/lib/validation/auth-schemas'

// Change of password and of address, from the account page, by a signed-in user (#236). Both ask the
// current password, and both count their attempts: a session left open cannot guess it.

const HOUR_MS = 3_600_000
const PER_HOUR = 5
const DAY_MS = 24 * HOUR_MS
const LINK_TTL_MS = DAY_MS
/** Requests to change an address: per user a day, and for the whole site a day (the mail provider's free plan has a daily quota). */
const EMAIL_CHANGES_PER_USER_PER_DAY = 10
const emailChangesPerDay = () => envNumber('EMAIL_CHANGES_MAX_PER_DAY', 100)

export type Outcome = { ok: true } | { ok: false; status: number; code: string; message: string }
const refuse = (status: number, code: string, message: string): Outcome => ({ ok: false, status, code, message })

/** The password given is the one of the account; false when it is not (or the account is gone). */
async function rightPassword(userId: string, password: string): Promise<boolean> {
  const hash = await findPasswordHash(userId)
  return hash !== null && verifyPassword(password, hash)
}

/**
 * Sets a new password. In one step every session of the user is closed and the reset links and the
 * change of address not yet used are cancelled (replacePassword); the session of this device is then
 * opened again, and the owner gets a mail.
 */
export async function changePassword(userId: string, current: string, next: string): Promise<Outcome> {
  const { allowed } = await consumeRateLimit(`account-password:${userId}`, PER_HOUR, HOUR_MS)
  if (!allowed) return refuse(429, 'rate_limited', 'Too many attempts. Try again in a while.')
  if (!(await rightPassword(userId, current))) return refuse(400, 'wrong_password', 'Wrong password.')

  const rules = SignupSchema.shape.password.safeParse(next)
  if (!rules.success) return refuse(400, 'weak_password', rules.error.issues[0].message)
  if (next === current) return refuse(400, 'same_password', 'The new password is the same as the current one.')

  const user = await findUserById(userId)
  if (!user) return refuse(401, 'unauthorized', 'Unauthorized')
  await replacePassword(userId, next)
  await createSession(userId)
  noticePasswordChanged(user.email)
  return { ok: true }
}

/**
 * Asks to change the address: a link goes to the NEW one, and the current one is told. Nothing changes yet.
 * The answer is the same whether the new address is free or already has an account: a free one gets the
 * link, a taken one gets a mail saying someone tried. Otherwise this would tell anyone with an account which
 * addresses are registered.
 */
export async function requestEmailChange(userId: string, password: string, address: string): Promise<Outcome & { email?: string }> {
  const { allowed } = await consumeRateLimit(`account-email:${userId}`, PER_HOUR, HOUR_MS)
  if (!allowed) return refuse(429, 'rate_limited', 'Too many attempts. Try again in a while.')
  if (!(await rightPassword(userId, password))) return refuse(400, 'wrong_password', 'Wrong password.')

  const parsed = z.email({ error: 'Enter a valid email address.' }).safeParse(address.trim())
  if (!parsed.success) return refuse(400, 'invalid_email', parsed.error.issues[0].message)
  const email = parsed.data.toLowerCase()

  const user = await findUserById(userId)
  if (!user) return refuse(401, 'unauthorized', 'Unauthorized')
  if (email === user.email.toLowerCase()) return refuse(400, 'same_email', 'This is already the address of your account.')

  // Each request sends a mail to an address of the asker's choice: a cap per user and one for the site.
  const mine = await consumeRateLimit(`account-email-day:${userId}`, EMAIL_CHANGES_PER_USER_PER_DAY, DAY_MS)
  if (!mine.allowed) return refuse(429, 'rate_limited', 'Too many address changes today. Try again tomorrow.')
  const site = await consumeRateLimit('account-email-all:day', emailChangesPerDay(), DAY_MS)
  if (!site.allowed) return refuse(503, 'busy', 'Address changes are paused for today. Try again tomorrow.')

  if (await emailTaken(email)) {
    noticeEmailAlreadyUsed(email)
  } else {
    // One link at a time: asking again makes the earlier one useless.
    await invalidateEmailTokens(userId, 'change-email')
    const token = await createEmailToken(userId, 'change-email', LINK_TTL_MS, email)
    noticeChangeEmailLink(email, `${appUrl()}/verify-email/change?token=${encodeURIComponent(token)}`)
  }
  noticeEmailChangeRequested(user.email, email)
  return { ok: true, email }
}

export type ChangeResult = 'changed' | 'taken' | TokenFailure

/** Uses the link sent to the new address: the account takes it, confirmed, and the old address is told. */
export async function confirmEmailChange(token: string | null): Promise<ChangeResult> {
  if (!token) return 'invalid'
  const result = await consumeEmailChangeToken(token)
  if ('failure' in result) return result.failure
  const user = await findUserById(result.userId)
  if (!user) return 'invalid'
  if (!(await updateEmail(result.userId, result.newEmail))) return 'taken'
  noticeEmailChanged(user.email, result.newEmail)
  return 'changed'
}
