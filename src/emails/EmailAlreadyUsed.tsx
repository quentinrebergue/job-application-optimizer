import { Heading, Text } from 'react-email'
import { EmailLayout, mailStyles as s } from './EmailLayout'

export const EMAIL_ALREADY_USED_SUBJECT = 'This address already has a FastResume account'

/**
 * Sent to an address that already has an account when someone asks to use it for another one (#236). The
 * person who asked is told nothing different from a success, so this is how the owner finds out.
 */
export function EmailAlreadyUsed() {
  return (
    <EmailLayout preview="Someone tried to use your address for another FastResume account.">
      <Heading as="h1" style={s.heading}>This address already has an account</Heading>
      <Text style={s.paragraph}>
        Someone asked to use this address for another FastResume account. Nothing changed: your account is as you left it.
      </Text>
      <Text style={s.paragraph}>If it was you, there is nothing to do: you already have an account here, log in with it. If it was not, ignore this mail.</Text>
    </EmailLayout>
  )
}
