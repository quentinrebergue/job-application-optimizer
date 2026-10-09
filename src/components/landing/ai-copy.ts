import { AI_ON_MISTRAL, AI_TRAINING_OPTED_OUT } from '@/config/legal'

interface AiFlags {
  onMistral: boolean
  trainingOptedOut: boolean
}

/**
 * What the landing page says about the AI. The first sentence is the charter's
 * "honest AI"; the others are added only when the work behind them is done (#192),
 * so the page never claims what the code does not do.
 */
export function aiStatement(flags: AiFlags = { onMistral: AI_ON_MISTRAL, trainingOptedOut: AI_TRAINING_OPTED_OUT }): string[] {
  const sentences = ['The AI chooses and orders what you wrote. It never invents an experience, a skill or a number.']
  if (flags.onMistral) {
    sentences.push('It runs on Mistral AI, a French company, in Europe. Your name and contact details are never sent to it.')
    if (flags.trainingOptedOut) sentences.push('We opted out of training: your content is not used to train the model.')
  }
  return sentences
}
