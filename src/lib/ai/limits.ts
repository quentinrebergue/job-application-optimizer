import { envNumber } from '@/lib/env'

// How much AI a user may use, and how much the site may spend (#203). The numbers are generous
// for a real person and come from the environment, to adjust from real usage without a rebuild.
// An invalid value falls back to the default (see envNumber).

export function aiLimits() {
  return {
    /** Rankings per user, in a rolling window. */
    perHour: envNumber('AI_PER_HOUR', 10),
    perDay: envNumber('AI_PER_DAY', 20),
    perWeek: envNumber('AI_PER_WEEK', 50),
    /** What the site may spend on the AI in a calendar month (UTC), in euros. */
    monthlyCapEur: envNumber('AI_MONTHLY_CAP_EUR', 3, false),
    /** The warning in the logs once the month's spending reaches this share of the cap. */
    warnAt: 0.8,
    /** The gateway's own limits (MAX_PROMPT_CHARS, MAX_OUTPUT_TOKENS): a call is reserved at the most they allow. */
    maxPromptChars: envNumber('AI_MAX_PROMPT_CHARS', 60000),
    maxOutputTokens: envNumber('AI_MAX_OUTPUT_TOKENS', 2000),
  }
}
