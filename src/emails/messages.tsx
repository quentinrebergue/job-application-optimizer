import type { ReactElement } from 'react'
import type { Email } from '@/lib/email/send'
import { VERIFY_EMAIL_SUBJECT, VerifyEmail } from './VerifyEmail'
import { RESET_PASSWORD_SUBJECT, ResetPassword } from './ResetPassword'
import { PASSWORD_CHANGED_SUBJECT, PasswordChanged } from './PasswordChanged'
import { DATA_EXPORTED_SUBJECT, DataExported } from './DataExported'
import { ACCOUNT_DELETED_SUBJECT, AccountDeleted } from './AccountDeleted'
import { CHANGE_EMAIL_SUBJECT, ChangeEmail } from './ChangeEmail'
import { EMAIL_CHANGE_REQUESTED_SUBJECT, EmailChangeRequested } from './EmailChangeRequested'
import { EMAIL_CHANGED_SUBJECT, EmailChanged } from './EmailChanged'
import { EMAIL_ALREADY_USED_SUBJECT, EmailAlreadyUsed } from './EmailAlreadyUsed'

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

export function resetPasswordMessage(to: string, url: string): Promise<Email> {
  return toEmail(to, RESET_PASSWORD_SUBJECT, <ResetPassword url={url} />)
}

export function passwordChangedMessage(to: string, resetUrl: string): Promise<Email> {
  return toEmail(to, PASSWORD_CHANGED_SUBJECT, <PasswordChanged resetUrl={resetUrl} />)
}

export function dataExportedMessage(to: string, resetUrl: string): Promise<Email> {
  return toEmail(to, DATA_EXPORTED_SUBJECT, <DataExported resetUrl={resetUrl} />)
}

export function accountDeletedMessage(to: string, contact: string): Promise<Email> {
  return toEmail(to, ACCOUNT_DELETED_SUBJECT, <AccountDeleted contact={contact} />)
}

export function changeEmailMessage(to: string, url: string): Promise<Email> {
  return toEmail(to, CHANGE_EMAIL_SUBJECT, <ChangeEmail url={url} />)
}

export function emailChangeRequestedMessage(to: string, newEmail: string, resetUrl: string): Promise<Email> {
  return toEmail(to, EMAIL_CHANGE_REQUESTED_SUBJECT, <EmailChangeRequested newEmail={newEmail} resetUrl={resetUrl} />)
}

export function emailChangedMessage(to: string, newEmail: string, contact: string): Promise<Email> {
  return toEmail(to, EMAIL_CHANGED_SUBJECT, <EmailChanged newEmail={newEmail} contact={contact} />)
}

export function emailAlreadyUsedMessage(to: string): Promise<Email> {
  return toEmail(to, EMAIL_ALREADY_USED_SUBJECT, <EmailAlreadyUsed />)
}
