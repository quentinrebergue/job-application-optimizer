import { Button, Heading, Text } from 'react-email'
import { EmailLayout, mailStyles as s } from './EmailLayout'

export const PASSWORD_CHANGED_SUBJECT = 'Your password was changed'

/** Sent after a reset, so the owner of the address hears about it either way. */
export function PasswordChanged({ resetUrl }: { resetUrl: string }) {
  return (
    <EmailLayout preview="The password of your FastResume account was just changed.">
      <Heading as="h1" style={s.heading}>Your password was changed</Heading>
      <Text style={s.paragraph}>
        The password of your FastResume account was just changed, and every device signed in with the old one was signed out.
      </Text>
      <Text style={s.paragraph}>If it was you, there is nothing to do. If it was not, reset your password now.</Text>
      <Button href={resetUrl} style={s.button}>Reset my password</Button>
    </EmailLayout>
  )
}
