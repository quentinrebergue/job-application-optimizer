import { Button, Heading, Text } from 'react-email'
import { EmailLayout, mailStyles as s } from './EmailLayout'

export const EMAIL_CHANGE_REQUESTED_SUBJECT = 'Your email address may change'

/** Sent to the CURRENT address when a change is asked: if it was not the owner, they can still react. */
export function EmailChangeRequested({ newEmail, resetUrl }: { newEmail: string; resetUrl: string }) {
  return (
    <EmailLayout preview="Someone asked to change the email address of your FastResume account.">
      <Heading as="h1" style={s.heading}>Your email address may change</Heading>
      <Text style={s.paragraph}>
        Someone signed in to your FastResume account and asked to change its address to {newEmail}. Nothing changes until the link sent
        to that address is opened.
      </Text>
      <Text style={s.paragraph}>If it was you, there is nothing to do. If it was not, reset your password now: it signs everyone out.</Text>
      <Button href={resetUrl} style={s.button}>Reset my password</Button>
    </EmailLayout>
  )
}
