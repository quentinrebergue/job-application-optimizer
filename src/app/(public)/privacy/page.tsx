import { LegalPage, LegalSection } from '@/components/legal/LegalPage'
import { aiPrivacy, importPrivacy } from '@/components/legal/ai-privacy'
import { ACCOUNT_TOOLS, AI_ON_MISTRAL, AI_PROVIDER, CONTACT_EMAIL, HOST, PUBLISHER_NAME } from '@/config/legal'

export const metadata = {
  title: 'Privacy',
  description: 'What FastResume stores about you, why, where, and what it never does with it.',
  alternates: { canonical: '/privacy' },
}

export default function PrivacyPage() {
  const mail = <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
  return (
    <LegalPage
      title="Privacy"
      intro="FastResume stores what it needs to build your resumes, in France, and nothing else. It never sells your data, shows ads, or trains a model on your resume."
    >
      <LegalSection title="Who is responsible">
        <p>FastResume is run by {PUBLISHER_NAME}, an individual, from France. He decides how your data is used. Contact: {mail}.</p>
      </LegalSection>

      <LegalSection title="What we store, and why">
        <ul>
          <li><strong>Your account:</strong> your email address and your password. The password is never stored: only a one-way hash (bcrypt). We use them to let you sign in and to send you the emails below.</li>
          <li><strong>Your library and your jobs:</strong> the experiences, projects, skills and education you write, your resume profile (name, contact details), and the job offers you add with the resumes you configure for them. We use them to build your resumes, and only for that.</li>
          <li><strong>A session cookie:</strong> one random identifier that keeps you signed in for 7 days. It is the only cookie, it is necessary for the service, and it is not used to follow you.</li>
          <li><strong>Your IP address, briefly:</strong> to slow down abuse (too many sign-in, sign-up or password-reset attempts), it is kept in a counter for about an hour, and the email address typed in a failed sign-in for 15 minutes. Like any web server, ours also log requests (including the IP address); these logs are rotated automatically and used only to fix problems.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Emails">
        <p>
          We send only the emails the service needs: confirm your address (also when you change it), reset your password, tell you
          your password or your address changed, tell you if someone tries to use your address for another account, tell you your
          data was downloaded, tell you your account was deleted. No newsletters, no marketing. They go through
          Brevo, a French email provider, which receives your address and the message.
        </p>
        <p>
          Brevo rewrites the links of its emails to count clicks and cannot turn this off for our account: the links in our
          emails, which carry a single-use token, therefore pass through a Brevo address before reaching our site. We do not use
          these statistics, and the tokens work only once and expire (24 hours to confirm an address, 30 minutes to reset a password).
        </p>
      </LegalSection>

      <LegalSection title="No trackers, no ads, no selling">
        <p>
          No analytics, no advertising, no third-party cookies, no social-media widgets. Your data is never sold, rented or shared for
          advertising, and never used to train an AI model. The one thing we cannot switch off is the click counting of our email
          provider, explained under Emails.
        </p>
      </LegalSection>

      <LegalSection title="The AI">
        <p>{aiPrivacy().join(' ')}</p>
        {importPrivacy().length > 0 && <p id="import">{importPrivacy().join(' ')}</p>}
        {AI_ON_MISTRAL && (
          <p>
            Mistral’s infrastructure providers and their countries are listed on its{' '}
            <a href={AI_PROVIDER.trustCenter}>sub-processors page</a>.
          </p>
        )}
      </LegalSection>

      <LegalSection title="Where your data lives, who can see it">
        <p>
          Everything is stored on {HOST.name} (OVHcloud) servers in France, under European law (GDPR). Only you see your content, and the AI provider named above when you use the AI ranking or import a resume. The
          maintainer can technically reach the database to run the service and does not read your content. A database backup is made
          every day and kept for 7 days, on the same infrastructure.
        </p>
      </LegalSection>

      <LegalSection title="How long we keep it">
        <ul>
          <li>Your account and library: until you delete your account.</li>
          <li>
            Sessions: they expire after 7 days. Links sent by mail: 24 hours to confirm an address, 30 minutes to reset a password; they
            are deleted a day after they expire, with the address they carried.
          </li>
          <li>Backups: 7 days, so deleted data disappears from them within a week.</li>
          <li>
            The log of AI ranking calls (date, tokens, cost): kept without your identity after you delete your account. It only
            serves to keep the site&apos;s monthly AI budget.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Your rights">
        <p>
          Under the GDPR you can ask for a copy of your data, correct it, delete it, or object to how it is used.{' '}
          {ACCOUNT_TOOLS
            ? 'You can export your data and delete your account yourself from your account page.'
            : <>Write to {mail}: we answer within one month and delete your account and data on request.</>}
        </p>
        <p>
          If you think we do not respect your rights, you can complain to the French data protection authority, the{' '}
          <a href="https://www.cnil.fr">CNIL</a>.
        </p>
      </LegalSection>

      <LegalSection title="Changes">
        <p>If this page changes in a way that matters, the date at the top changes with it.</p>
      </LegalSection>
    </LegalPage>
  )
}
