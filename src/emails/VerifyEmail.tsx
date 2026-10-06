import { Button, Heading, Link, Text } from '@react-email/components'
import { EmailLayout, mailStyles as s } from './EmailLayout'

export const VERIFY_EMAIL_SUBJECT = 'Confirm your email address'

/** Sent at sign-up and on "Resend": one link that confirms the address. */
export function VerifyEmail({ url }: { url: string }) {
  return (
    <EmailLayout preview="Confirm your address to unlock the AI ranking of your resume.">
      <Heading as="h1" style={s.heading}>Confirm your email address</Heading>
      <Text style={s.paragraph}>
        Welcome to FastResume. Confirm that this address is yours to unlock the AI ranking of your resume.
      </Text>
      <Button href={url} style={s.button}>Confirm my email</Button>
      <Text style={s.small}>
        If the button does not work, open this link:
        <br />
        <Link href={url} style={s.link}>{url}</Link>
      </Text>
      <Text style={s.small}>The link is valid for 24 hours. If you did not create an account, ignore this mail.</Text>
    </EmailLayout>
  )
}
