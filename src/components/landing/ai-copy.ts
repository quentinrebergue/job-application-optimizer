import { AI_ANONYMISED, AI_ON_OVHCLOUD } from '@/config/legal'

interface AiFlags {
  onOvhcloud: boolean
  anonymised: boolean
}

/**
 * What the landing page says about the AI. The first sentence is the charter's
 * "honest AI"; the others are added only when the work behind them is done (#44),
 * so the page never claims what the code does not do.
 */
export function aiStatement(flags: AiFlags = { onOvhcloud: AI_ON_OVHCLOUD, anonymised: AI_ANONYMISED }): string[] {
  const sentences = ['The AI chooses and orders what you wrote. It never invents an experience, a skill or a number.']
  if (flags.onOvhcloud) {
    sentences.push('It is an open-source model hosted by OVHcloud in France: what it reads is not kept and never used to train it.')
    if (flags.anonymised) sentences.push('Your name and contact details are removed before anything is sent.')
  }
  return sentences
}
