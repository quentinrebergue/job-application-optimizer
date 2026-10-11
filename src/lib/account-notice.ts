import 'server-only'
import { after } from 'next/server'
import { CONTACT_EMAIL } from '@/config/legal'
import {
  accountDeletedMessage,
  changeEmailMessage,
  dataExportedMessage,
  emailAlreadyUsedMessage,
  emailChangedMessage,
  emailChangeRequestedMessage,
  passwordChangedMessage,
} from '@/emails/messages'
import { sendEmail } from '@/lib/email/send'
import { appUrl } from '@/lib/email/providers'
import { consumeRateLimit } from '@/lib/rate-limit'

// The owner of an address hears when their data is downloaded, their account deleted (#104), their password or
// address changed (#236): if it was not them, they know. The mail goes out after the response and its failure never fails the request.

function later(build: () => ReturnType<typeof dataExportedMessage>, what: string) {
  after(async () => {
    try {
      await sendEmail(await build())
    } catch (err) {
      console.error(`${what} not sent`, err)
    }
  })
}

/** At most one such mail an hour per user: ten exports an hour must not become ten mails. */
export async function noticeDataExported(userId: string, email: string): Promise<void> {
  const { allowed } = await consumeRateLimit(`account-export-mail:${userId}`, 1, 3_600_000)
  if (allowed) later(() => dataExportedMessage(email, `${appUrl()}/forgot-password`), 'data exported mail')
}

export function noticeAccountDeleted(email: string): void {
  later(() => accountDeletedMessage(email, CONTACT_EMAIL), 'account deleted mail')
}

export function noticePasswordChanged(email: string): void {
  later(() => passwordChangedMessage(email, `${appUrl()}/forgot-password`), 'password changed mail')
}

/** To the current address when a change is asked: it can still reset the password. */
export function noticeEmailChangeRequested(email: string, newEmail: string): void {
  later(() => emailChangeRequestedMessage(email, newEmail, `${appUrl()}/forgot-password`), 'email change requested mail')
}

/** To the old address once the change is done. */
export function noticeEmailChanged(oldEmail: string, newEmail: string): void {
  later(() => emailChangedMessage(oldEmail, newEmail, CONTACT_EMAIL), 'email changed mail')
}

/** The link to the NEW address. After the response like the others: the answer must not depend on the address. */
export function noticeChangeEmailLink(newEmail: string, url: string): void {
  later(() => changeEmailMessage(newEmail, url), 'change email link mail')
}

/** To an address that already has an account, when someone asks to use it for another one. */
export function noticeEmailAlreadyUsed(email: string): void {
  later(() => emailAlreadyUsedMessage(email), 'email already used mail')
}
