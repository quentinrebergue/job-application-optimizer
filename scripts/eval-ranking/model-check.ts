/**
 * `--model` only names the prices: the model that answers is the one the gateway started with (#218). The gateway says
 * which one replied; this compares it with what the run claims, so a run against the wrong model cannot pass for a good one.
 */

/** Same model, ignoring the case and a version suffix on either side ("mistral-small" matches "mistral-small-2603"). */
export function sameModel(asked: string, answered: string): boolean {
  const a = asked.trim().toLowerCase()
  const b = answered.trim().toLowerCase()
  return a === b || a.startsWith(`${b}-`) || b.startsWith(`${a}-`)
}

/** The models that answered and are not the one asked for; empty when there is nothing to compare or all match. */
export function modelMismatch(asked: string | undefined, answered: Iterable<string>): string[] {
  if (!asked) return []
  return [...new Set(answered)].filter((model) => !sameModel(asked, model))
}

export function mismatchWarning(asked: string, wrong: string[]): string {
  return `WARNING: --model says ${asked}, but the gateway answered with ${wrong.join(', ')}. The prices and the comparison are for another model: do not trust this run.`
}
