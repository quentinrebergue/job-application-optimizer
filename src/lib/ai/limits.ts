// How much AI a user may use, and how much the site may spend (#203). The numbers are generous
// for a real person and come from the environment, to adjust from real usage without a rebuild.
// An invalid value falls back to the default: a typo must not switch a limit off.

function number(name: string, fallback: number, whole = true): number {
  const value = Number(process.env[name])
  const valid = whole ? Number.isInteger(value) : Number.isFinite(value)
  return valid && value > 0 ? value : fallback
}

export function aiLimits() {
  return {
    /** Rankings per user, in a rolling window. */
    perHour: number('AI_PER_HOUR', 10),
    perDay: number('AI_PER_DAY', 20),
    perWeek: number('AI_PER_WEEK', 50),
    /** What the site may spend on the AI in a calendar month (UTC), in euros. */
    monthlyCapEur: number('AI_MONTHLY_CAP_EUR', 3, false),
    /** The warning in the logs once the month's spending reaches this share of the cap. */
    warnAt: 0.8,
    /** The gateway's own limits (MAX_PROMPT_CHARS, MAX_OUTPUT_TOKENS): a call is reserved at the most they allow. */
    maxPromptChars: number('AI_MAX_PROMPT_CHARS', 60000),
    maxOutputTokens: number('AI_MAX_OUTPUT_TOKENS', 2000),
  }
}
