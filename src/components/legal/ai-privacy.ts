import { AI_ON_MISTRAL, AI_PROVIDER, AI_TRAINING_OPTED_OUT, AI_ZERO_RETENTION } from '@/config/legal'

interface Flags {
  onMistral: boolean
  trainingOptedOut: boolean
  zeroRetention: boolean
}

/**
 * The privacy page's section on the AI, as sentences. Each one is true only once its flag is set (#192);
 * the page never says what the code or the Mistral settings do not do.
 */
export function aiPrivacy(
  flags: Flags = { onMistral: AI_ON_MISTRAL, trainingOptedOut: AI_TRAINING_OPTED_OUT, zeroRetention: AI_ZERO_RETENTION },
): string[] {
  if (!flags.onMistral) {
    return [
      'The AI ranking is not available yet. When it is, it will run on a model hosted in Europe, and this page will say exactly what is sent before the feature goes live.',
    ]
  }
  return [
    `When you rank your library against a job offer, the text of the offer and the content of your library entries (titles, companies, descriptions, tags) are sent to ${AI_PROVIDER.name}, a French company based in ${AI_PROVIDER.seat.split(',')[0]}, which processes them for us under a data processing agreement.`,
    'The title and the profile paragraph of your resume are sent too, so that the AI can suggest a version for the offer. Before they leave, our code takes out your name, your email address, your phone number, the links to your profiles and your date of birth. We add nothing else: not your name, your email address or your phone number.',
    'The model is open-weight (Mistral Small, Apache 2.0 licence). It is hosted by Mistral and its cloud providers in the European Economic Area, through Mistral’s European endpoint, never its US one.',
    flags.zeroRetention
      ? 'Mistral does not store or log these requests.'
      : 'Mistral also runs automated abuse monitoring on these requests, so they may be kept for a limited time.',
    flags.trainingOptedOut
      ? 'We opted out of training: Mistral does not use these requests to train its models.'
      : 'Mistral’s terms let it use these requests to train its models unless the customer opts out.',
    'For each ranking or import we also record, on our side, the date, the model, the number of tokens and the cost, never the content. They serve the limits per person and the monthly budget of the site. We keep them for the current and the previous month; after that each month is replaced by a total (calls, tokens, cost) with no identity in it. If you delete your account, your records stay until then without your identity.',
    'The AI chooses and orders what you wrote; it never adds an experience, a skill or a number you did not write. Its suggestions for your title and profile are only proposals: nothing changes in your resume until you press “Use this”, and the words they hold that are in neither your library nor the offer are listed for you to check.',
  ]
}

const DEFAULT_FLAGS: Flags = { onMistral: AI_ON_MISTRAL, trainingOptedOut: AI_TRAINING_OPTED_OUT, zeroRetention: AI_ZERO_RETENTION }

/** What becomes of a resume imported from a PDF (#110), for the privacy page. True only as far as the flags go. */
export function importPrivacy(flags: Flags = DEFAULT_FLAGS): string[] {
  if (!flags.onMistral) return []
  return [
    'When you import your resume from a PDF, it is turned into text on our servers.',
    'Our code then finds your name, your email address, your phone number, the links to your profiles (LinkedIn, GitHub...) and your date of birth, takes them out of the text and puts them in your profile: they are never sent to the AI. A name written in an unusual place may escape it.',
    `The rest of the text (your experiences, projects, education and skills, and the city) is sent to ${AI_PROVIDER.name} to be sorted into your library, under the same terms as the ranking above.`,
    'Neither the PDF nor its text is kept: what remains is the entries added to your library and the fields of your profile that were empty, which you can change or delete.',
  ]
}

/** The same, in two sentences, under the file field of the import dialog. */
export function importNotice(flags: Flags = DEFAULT_FLAGS): string {
  const kept = flags.zeroRetention ? 'does not keep it' : 'keeps it for a limited time to watch for abuse'
  const training = flags.trainingOptedOut ? 'does not train on it, and ' : ''
  return (
    'Your name, email, phone and links are taken out of your resume on our servers and never sent to the AI. ' +
    `The rest is sent to ${AI_PROVIDER.name}, in Europe, to sort it into your library: it ${training}${kept}.`
  )
}
