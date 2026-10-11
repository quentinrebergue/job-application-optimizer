import { Button, Heading, Text } from 'react-email'
import { EmailLayout, mailStyles as s } from './EmailLayout'

export const DATA_EXPORTED_SUBJECT = 'A copy of your data was downloaded'

/** Sent after an export, so the owner of the address hears about it if it was not them. */
export function DataExported({ resetUrl }: { resetUrl: string }) {
  return (
    <EmailLayout preview="A copy of your FastResume data was just downloaded.">
      <Heading as="h1" style={s.heading}>A copy of your data was downloaded</Heading>
      <Text style={s.paragraph}>
        Someone signed in to your FastResume account and downloaded a copy of your data (profile, library and jobs).
      </Text>
      <Text style={s.paragraph}>If it was you, there is nothing to do. If it was not, reset your password now.</Text>
      <Button href={resetUrl} style={s.button}>Reset my password</Button>
    </EmailLayout>
  )
}
