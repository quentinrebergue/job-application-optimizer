import 'server-only'
import { consumeEmailToken, countRecentTokens, createEmailToken, type TokenFailure } from '@/lib/data/email-tokens'
import { findUserById, markEmailVerified } from '@/lib/data/users'
import { appUrl } from '@/lib/email/providers'
import { sendEmail } from '@/lib/email/send'
import { verifyEmailMessage } from '@/emails/messages'

const LINK_TTL_MS = 24 * 60 * 60 * 1000
/** Resends: at most one a minute, and five an hour, per user. */
const RESEND_GAP_MS = 60 * 1000
const RESEND_MAX_PER_HOUR = 5

/** The page the link of the mail opens; it confirms then shows the result. */
export function confirmUrl(token: string): string {
  return `${appUrl()}/verify-email/confirm?token=${encodeURIComponent(token)}`
}

/** Creates a link and mails it. Throws if the mail could not be sent. */
export async function sendVerificationEmail(user: { id: string; email: string }): Promise<void> {
  const token = await createEmailToken(user.id, 'verify', LINK_TTL_MS)
  await sendEmail(await verifyEmailMessage(user.email, confirmUrl(token)))
}

export type ResendResult = { ok: true } | { ok: false; message: string }

/** "Resend the email": refused when already confirmed or asked too often. */
export async function resendVerificationEmail(userId: string, now = new Date()): Promise<ResendResult> {
  const user = await findUserById(userId)
  if (!user) return { ok: false, message: 'Sign in again to get a new link.' }
  if (user.emailVerified) return { ok: false, message: 'Your email is already confirmed.' }

  const { count, latest } = await countRecentTokens(user.id, 'verify', new Date(now.getTime() - 60 * 60 * 1000))
  if (latest && now.getTime() - latest.getTime() < RESEND_GAP_MS) {
    return { ok: false, message: 'A mail was just sent. Wait a minute before asking again.' }
  }
  if (count >= RESEND_MAX_PER_HOUR) {
    return { ok: false, message: 'Too many mails were sent. Try again in an hour.' }
  }

  try {
    await sendVerificationEmail(user)
    return { ok: true }
  } catch (err) {
    console.error('verification mail not sent', err)
    return { ok: false, message: 'The mail could not be sent. Try again in a few minutes.' }
  }
}

export type ConfirmResult = 'confirmed' | TokenFailure

/** Uses the link of the mail; the user is confirmed when it is valid. */
export async function confirmEmail(token: string | null): Promise<ConfirmResult> {
  if (!token) return 'invalid'
  const result = await consumeEmailToken(token, 'verify')
  if ('failure' in result) return result.failure
  await markEmailVerified(result.userId)
  return 'confirmed'
}
