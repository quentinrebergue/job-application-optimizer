import { AiGatewayError } from './gateway'
import type { Outcome } from './usage'

/**
 * How a failed ranking is counted (#203). What never reached the AI, or that the provider does
 * not bill, is not counted: when Mistral is down a user does not use up their hour on errors.
 * What did reach it is: a timeout (the provider may have billed the prompt) and an answer the
 * gateway could not use. Anything else (an error in our own code after the answer) counts too.
 */
const NOT_COUNTED = new Set([
  'ai_disabled', // the kill switch
  'ai_unavailable', // the provider answered with an error, after the gateway's retries
  'prompt_too_large',
  'schema_too_large',
  'invalid_request',
])

export function outcomeOfFailure(error: unknown): Outcome {
  if (error instanceof AiGatewayError) {
    if (error.code && NOT_COUNTED.has(error.code)) return { status: 'released' }
    if (error.status === 504) return { status: 'failed', timedOut: true }
    // The gateway could not be reached at all (no code): nothing was asked of the AI.
    if (!error.code) return { status: 'released' }
    return { status: 'failed', timedOut: false }
  }
  return { status: 'failed', timedOut: false }
}
