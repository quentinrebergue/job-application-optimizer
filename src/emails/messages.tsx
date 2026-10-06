import type { ReactElement } from 'react'
import type { Email } from '@/lib/email/send'
import { VERIFY_EMAIL_SUBJECT, VerifyEmail } from './VerifyEmail'

/**
 * Turns a mail component into what sendEmail() takes: HTML and the plain-text version.
 * `render` is imported when a mail is sent, not with this module: it pulls in
 * prettier, an ES module the server loads with a top-level await, which breaks
 * the chunk shared by every page of the app (production build, #130).
 */
async function toEmail(to: string, subject: string, mail: ReactElement): Promise<Email> {
  const { render } = await import('react-email')
  const [html, text] = await Promise.all([render(mail), render(mail, { plainText: true })])
  return { to, subject, html, text }
}

export function verifyEmailMessage(to: string, url: string): Promise<Email> {
  return toEmail(to, VERIFY_EMAIL_SUBJECT, <VerifyEmail url={url} />)
}
