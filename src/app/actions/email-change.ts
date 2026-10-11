'use server'

import { redirect } from 'next/navigation'
import { confirmEmailChange } from '@/lib/auth/credentials'
import { emailChangeStatus } from '@/lib/auth/email-change-status'

/**
 * The button of the page the link opens (#236): the address changes here, on a click, not when the page
 * opens. A mail scanner that follows the link only sees the page. A Server Action is also checked by
 * Next.js against the origin of the request.
 */
export async function confirmEmailChangeAction(formData: FormData): Promise<void> {
  const token = formData.get('token')
  const result = await confirmEmailChange(typeof token === 'string' ? token : null)
  redirect(`/verify-email?status=${emailChangeStatus(result)}`)
}
