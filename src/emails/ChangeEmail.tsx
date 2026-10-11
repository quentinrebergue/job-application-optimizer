import { Button, Heading, Link, Text } from 'react-email'
import { EmailLayout, mailStyles as s } from './EmailLayout'

export const CHANGE_EMAIL_SUBJECT = 'Confirm your new email address'

/** Sent to the NEW address: the account changes address only when this link is opened. */
export function ChangeEmail({ url }: { url: string }) {
  return (
    <EmailLayout preview="Confirm that this is your new address for FastResume.">
      <Heading as="h1" style={s.heading}>Confirm your new email address</Heading>
      <Text style={s.paragraph}>Someone asked to use this address for a FastResume account. Confirm that it is yours to make the change.</Text>
      <Button href={url} style={s.button}>Confirm my new email</Button>
      <Text style={s.small}>
        If the button does not work, open this link:
        <br />
        <Link href={url} style={s.link}>{url}</Link>
      </Text>
      <Text style={s.small}>The link is valid for 24 hours and works once. If you did not ask for it, ignore this mail: nothing changes.</Text>
    </EmailLayout>
  )
}
