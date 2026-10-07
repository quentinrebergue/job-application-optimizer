import { Button, Heading, Link, Text } from 'react-email'
import { EmailLayout, mailStyles as s } from './EmailLayout'

export const RESET_PASSWORD_SUBJECT = 'Reset your password'

/** Sent from "Forgot password?": one link to choose a new password. */
export function ResetPassword({ url }: { url: string }) {
  return (
    <EmailLayout preview="Choose a new password for your FastResume account.">
      <Heading as="h1" style={s.heading}>Reset your password</Heading>
      <Text style={s.paragraph}>Someone asked to reset the password of your FastResume account. If it was you, choose a new one.</Text>
      <Button href={url} style={s.button}>Choose a new password</Button>
      <Text style={s.small}>
        If the button does not work, open this link:
        <br />
        <Link href={url} style={s.link}>{url}</Link>
      </Text>
      <Text style={s.small}>
        The link is valid for 30 minutes and works once. If you did not ask for it, ignore this mail: your password stays the same.
      </Text>
    </EmailLayout>
  )
}
