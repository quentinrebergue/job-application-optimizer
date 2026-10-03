// Dates are stored as ISO strings. Formatting them in UTC gives the same text on
// the server and in the browser, whatever their time zones: no hydration
// mismatch (#47).

const STYLES = {
  short: { day: 'numeric', month: 'short', year: 'numeric' },
  long: { day: 'numeric', month: 'long', year: 'numeric' },
} as const satisfies Record<string, Intl.DateTimeFormatOptions>

export function formatDate(iso: string, style: keyof typeof STYLES = 'short'): string {
  return new Date(iso).toLocaleDateString('en-GB', { ...STYLES[style], timeZone: 'UTC' })
}
