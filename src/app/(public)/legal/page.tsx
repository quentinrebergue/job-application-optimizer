import { LegalPage, LegalSection } from '@/components/legal/LegalPage'
import { CONTACT_EMAIL, HOST, PUBLISHER_NAME } from '@/config/legal'

export const metadata = {
  title: 'Legal notice',
  description: 'Who publishes FastResume and who hosts it.',
  alternates: { canonical: '/legal' },
}

export default function LegalNoticePage() {
  return (
    <LegalPage title="Legal notice" intro="The information French law asks every website to publish (mentions légales).">
      <LegalSection title="Publisher">
        <p>
          FastResume is published by {PUBLISHER_NAME}, an individual (non-professional), France. He is also the director of the publication.
        </p>
        <p>Contact: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p>
      </LegalSection>

      <LegalSection title="Host">
        <p>
          {HOST.name}, {HOST.address}. <a href={HOST.website}>{HOST.website}</a>
        </p>
      </LegalSection>

      <LegalSection title="Personal data">
        <p>How your data is handled is explained on the <a href="/privacy">privacy page</a>.</p>
      </LegalSection>

      <LegalSection title="Content and trademarks">
        <p>
          What you write in FastResume stays yours. The name FastResume, its logo and its texts belong to the publisher.
        </p>
      </LegalSection>
    </LegalPage>
  )
}
