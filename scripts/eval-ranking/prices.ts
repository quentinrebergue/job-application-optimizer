/**
 * What a call costs, per model, to compare the ways of ranking by their price.
 * Euros per million tokens, read in the Mistral console and the OVHcloud catalogue
 * (October 2026): check them again before relying on a figure.
 *
 * The cached price is not used: the gateway does not report cached tokens, so a
 * cost computed here is an upper bound.
 */
export const PRICES: Record<string, { input: number; output: number }> = {
  'mistral-medium-2604': { input: 1.28, output: 6.38 },
  'mistral-small-2603': { input: 0.13, output: 0.51 },
  'meta-llama-3_3-70b-instruct': { input: 0.67, output: 0.67 },
}

/** The price per million tokens of a model, or null when it is unknown. */
export function priceOf(model: string | undefined): { input: number; output: number } | null {
  return (model && PRICES[model.toLowerCase()]) || null
}

/** The cost in euros of one call, or null when the model has no known price. */
export function costOf(model: string | undefined, promptTokens: number, completionTokens: number): number | null {
  const price = model ? PRICES[model.toLowerCase()] : undefined
  return price ? (promptTokens * price.input + completionTokens * price.output) / 1e6 : null
}
