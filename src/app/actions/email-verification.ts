'use server'

import { verifySession } from '@/lib/auth/dal'
import { resendVerificationEmail, type ResendResult } from '@/lib/auth/email-verification'

/** "Resend the email" of the confirmation banner. */
export async function resendVerification(): Promise<ResendResult> {
  const { userId } = await verifySession()
  return resendVerificationEmail(userId)
}
