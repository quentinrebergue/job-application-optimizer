import { Heading, Link, Text } from 'react-email'
import { EmailLayout, mailStyles as s } from './EmailLayout'

export const ACCOUNT_DELETED_SUBJECT = 'Your account was deleted'

/** Sent after a deletion, so the owner of the address hears about it if it was not them. */
export function AccountDeleted({ contact }: { contact: string }) {
  return (
    <EmailLayout preview="Your FastResume account and its data were just deleted.">
      <Heading as="h1" style={s.heading}>Your account was deleted</Heading>
      <Text style={s.paragraph}>
        Your FastResume account and all its data were just deleted. A copy stays in our daily backups for up to 7 days, then
        disappears.
      </Text>
      <Text style={s.paragraph}>
        If it was you, there is nothing to do. If it was not, write to <Link href={`mailto:${contact}`} style={s.link}>{contact}</Link>{' '}
        within 7 days.
      </Text>
    </EmailLayout>
  )
}
