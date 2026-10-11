import { Heading, Link, Text } from 'react-email'
import { EmailLayout, mailStyles as s } from './EmailLayout'

export const EMAIL_CHANGED_SUBJECT = 'Your email address was changed'

/** Sent to the OLD address once the change is done: from now on it can no longer reset the password. */
export function EmailChanged({ newEmail, contact }: { newEmail: string; contact: string }) {
  return (
    <EmailLayout preview="The email address of your FastResume account was just changed.">
      <Heading as="h1" style={s.heading}>Your email address was changed</Heading>
      <Text style={s.paragraph}>The address of your FastResume account is now {newEmail}. This address no longer gives access to it.</Text>
      <Text style={s.paragraph}>
        If it was you, there is nothing to do. If it was not, write to <Link href={`mailto:${contact}`} style={s.link}>{contact}</Link> right away.
      </Text>
    </EmailLayout>
  )
}
