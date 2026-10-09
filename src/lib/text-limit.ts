import { LONG_TEXT_FROM } from '@/config/limits'

// What a form shows about the size of a text (#201). Client-safe.

/** The message under a field whose text is over its limit, or undefined. */
export function tooLong(value: string, max: number | undefined): string | undefined {
  if (!max || value.trim().length <= max) return undefined
  return `Too long: ${max.toLocaleString('en-US')} characters at most.`
}

/** A long text shows a counter; a short one just stops at its limit. */
export const isLongText = (max: number | undefined): max is number => max !== undefined && max >= LONG_TEXT_FROM

/** The `count` of a <Field> for a long text; none for a short one. */
export function counterFor(value: string, max: number | undefined): { used: number; max: number } | undefined {
  return isLongText(max) ? { used: value.trim().length, max } : undefined
}
