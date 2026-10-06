import type { ReactElement } from 'react'
import { render } from '@react-email/render'
import type { Email } from '@/lib/email/send'
import { VERIFY_EMAIL_SUBJECT, VerifyEmail } from './VerifyEmail'

/** Turns a mail component into what sendEmail() takes: HTML and the plain-text version. */
async function toEmail(to: string, subject: string, mail: ReactElement): Promise<Email> {
  const [html, text] = await Promise.all([render(mail), render(mail, { plainText: true })])
  return { to, subject, html, text }
}

export function verifyEmailMessage(to: string, url: string): Promise<Email> {
  return toEmail(to, VERIFY_EMAIL_SUBJECT, <VerifyEmail url={url} />)
}
