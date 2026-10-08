import { LegalPage, LegalSection } from '@/components/legal/LegalPage'
import { CONTACT_EMAIL, PUBLISHER_NAME } from '@/config/legal'

export const metadata = {
  title: 'Terms of use',
  description: 'The short rules of using FastResume.',
  alternates: { canonical: '/terms' },
}

export default function TermsPage() {
  return (
    <LegalPage title="Terms of use" intro="Short and plain. By creating an account or using FastResume you accept them.">
      <LegalSection title="A free service">
        <p>
          FastResume is free, for everyone, with every feature. It is run by {PUBLISHER_NAME}, an individual, for people who look for
          a job, not for profit.
        </p>
      </LegalSection>

      <LegalSection title="No guarantee">
        <p>
          The service is provided as it is, with the care of one person, and without guarantee of availability or result. It can be
          slow, change or stop. The AI suggests, you decide: check every resume before you send it. As far as the law allows, the
          publisher is not liable for what follows from using it.
        </p>
      </LegalSection>

      <LegalSection title="Your content">
        <p>
          What you write is yours. You allow FastResume to store and process it only to provide the service to you (build and
          render your resumes). You are responsible for what you write: it must be about you, true, and lawful.
        </p>
      </LegalSection>

      <LegalSection title="Fair use">
        <p>
          Do not attack the service, overload it, try to reach other people&apos;s data, or use it to send spam. The AI and the
          resume rendering are shared by everyone: automated or massive use is not allowed. Abusive accounts can be suspended.
        </p>
      </LegalSection>

      <LegalSection title="Leaving">
        <p>
          You can stop at any time and ask to delete your account (see the <a href="/privacy">privacy page</a>).
        </p>
      </LegalSection>

      <LegalSection title="Changes and law">
        <p>
          These terms can change; the date at the top says when. They are governed by French law. A question or a problem:{' '}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </LegalSection>
    </LegalPage>
  )
}
