import 'server-only'
import { after } from 'next/server'
import { CONTACT_EMAIL } from '@/config/legal'
import { accountDeletedMessage, dataExportedMessage } from '@/emails/messages'
import { sendEmail } from '@/lib/email/send'
import { appUrl } from '@/lib/email/providers'
import { consumeRateLimit } from '@/lib/rate-limit'

// The owner of an address hears when their data is downloaded or their account deleted (#104): if it was
// not them, they know. The mail goes out after the response and its failure never fails the request.

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
