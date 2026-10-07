import 'server-only'
import { after } from 'next/server'
import {
  countRecentTokens,
  createEmailToken,
  consumeEmailToken,
  invalidateEmailTokens,
  peekEmailToken,
  type TokenFailure,
} from '@/lib/data/email-tokens'
import { findUserByEmail, findUserById, updatePassword } from '@/lib/data/users'
import { deleteAllSessions } from '@/lib/auth/session'
import { consumeRateLimit, deleteExpiredRateLimits, isPublicIp } from '@/lib/rate-limit'
import { appUrl } from '@/lib/email/providers'
import { sendEmail } from '@/lib/email/send'
import { passwordChangedMessage, resetPasswordMessage } from '@/emails/messages'

const LINK_TTL_MS = 30 * 60 * 1000
const HOUR_MS = 60 * 60 * 1000
/** Per address: at most one mail a minute and three an hour. */
const EMAIL_GAP_MS = 60 * 1000
const EMAIL_MAX_PER_HOUR = 3
/** Per visitor IP (only when the real one is known): ten requests an hour. */
const IP_MAX_PER_HOUR = 10

export function resetUrl(token: string): string {
  return `${appUrl()}/reset-password?token=${encodeURIComponent(token)}`
}

/** Mails go out after the response: answering at once whether the account exists or not. */
function sendLater(build: () => Promise<Parameters<typeof sendEmail>[0]>, what: string) {
  after(async () => {
    try {
      await sendEmail(await build())
    } catch (err) {
      console.error(`${what} not sent`, err)
    }
  })
}

export type ResetRequest = 'sent' | 'too-many'

/**
 * "Forgot password?". The answer never tells whether an account exists: it is
 * 'sent' in both cases, and the mail goes out after the response so the delay
 * does not tell either. Only the per-IP limit can answer 'too-many', which
 * says nothing about the address.
 */
export async function requestPasswordReset(email: string, ip: string | null, now = new Date()): Promise<ResetRequest> {
  if (ip && isPublicIp(ip)) {
    const { allowed } = await consumeRateLimit(`reset-ip:${ip}`, IP_MAX_PER_HOUR, HOUR_MS, now)
    if (!allowed) return 'too-many'
  }
  after(() => deleteExpiredRateLimits().catch(() => {}))

  const user = await findUserByEmail(email)
  if (!user) return 'sent'

  // Over the per-address limit: no new mail, same answer.
  const { count, latest } = await countRecentTokens(user.id, 'reset', new Date(now.getTime() - HOUR_MS))
  if (count >= EMAIL_MAX_PER_HOUR || (latest && now.getTime() - latest.getTime() < EMAIL_GAP_MS)) return 'sent'

  const token = await createEmailToken(user.id, 'reset', LINK_TTL_MS)
  sendLater(() => resetPasswordMessage(user.email, resetUrl(token)), 'reset mail')
  return 'sent'
}

/** Whether a reset link can still be used, without using it. */
export async function checkResetToken(token: string | null): Promise<'valid' | TokenFailure> {
  if (!token) return 'invalid'
  const result = await peekEmailToken(token, 'reset')
  return 'failure' in result ? result.failure : 'valid'
}

/**
 * Sets the new password from a reset link: the link is used once, every
 * session of the user is closed, older reset links stop working, and the
 * owner of the address gets a "password changed" mail.
 */
export async function resetPassword(token: string, password: string): Promise<{ userId: string } | { failure: TokenFailure }> {
  const result = await consumeEmailToken(token, 'reset')
  if ('failure' in result) return result

  await updatePassword(result.userId, password)
  await deleteAllSessions(result.userId)
  await invalidateEmailTokens(result.userId, 'reset')

  const user = await findUserById(result.userId)
  if (user) sendLater(() => passwordChangedMessage(user.email, `${appUrl()}/forgot-password`), 'password changed mail')
  return { userId: result.userId }
}
