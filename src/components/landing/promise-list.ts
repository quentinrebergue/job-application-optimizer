import { AI_ON_MISTRAL } from '@/config/legal'

/**
 * What the landing page promises. The charter decides: a promise is shown only
 * once it is true (docs/charter.md). One that is not true yet has `blockedBy`,
 * the ticket that makes it true; delete that field the day it ships and it
 * appears on the page.
 */
export interface Promise {
  /** Short name, the title of the sticker */
  title: string
  /** One line under the title */
  note: string
  blockedBy?: string
}

export const ALL_PROMISES: Promise[] = [
  { title: 'Free', note: 'Every feature, for everyone.' },
  // The AI half of the note ships with AI_ON_MISTRAL (config/legal.ts).
  {
    title: 'Hosted in France',
    note: AI_ON_MISTRAL
      ? 'OVHcloud servers, and the AI by Mistral AI (French too). Under European law (GDPR).'
      : 'OVHcloud servers, under European law (GDPR).',
  },
  { title: 'No tracking', note: 'No analytics, no ads, one cookie.' },
  { title: 'Not for profit', note: 'No ads, no paid plan.' },
  { title: 'Your data is yours', note: 'Never sold, never used to train a model.' },
  // Not true yet:
  { title: 'Open source', note: 'Read it, run it, improve it.', blockedBy: '#107' },
]

/** What the page shows today. */
export const PROMISES = ALL_PROMISES.filter((promise) => !promise.blockedBy)
