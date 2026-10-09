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
    'We add nothing else: not your name, your email address or your phone number.',
    'The model is open-weight (Mistral Small, Apache 2.0 licence). It is hosted by Mistral and its cloud providers in the European Economic Area, through Mistral’s European endpoint, never its US one.',
    flags.zeroRetention
      ? 'Mistral does not store or log these requests.'
      : 'Mistral also runs automated abuse monitoring on these requests, so they may be kept for a limited time.',
    flags.trainingOptedOut
      ? 'We opted out of training: Mistral does not use these requests to train its models.'
      : 'Mistral’s terms let it use these requests to train its models unless the customer opts out.',
    'The AI chooses and orders what you wrote; it never adds an experience, a skill or a number you did not write.',
  ]
}
