/**
 * Prints what is sent to the AI and what comes back, to read it while developing (#267). Off unless AI_DEBUG=1, and
 * only in `next dev`: in a production build it does nothing whatever the variable says. The text of a resume is
 * personal data, so production never logs it: this exists only on a developer's machine.
 */
export function debugEnabled(): boolean {
  return process.env.NODE_ENV === 'development' && process.env.AI_DEBUG === '1'
}

export function debugExchange(title: string, parts: Record<string, unknown>): void {
  if (!debugEnabled()) return
  const lines = [`\n──── AI debug: ${title} ────`]
  for (const [name, value] of Object.entries(parts)) {
    lines.push(`── ${name}`, typeof value === 'string' ? value : JSON.stringify(value, null, 2))
  }
  console.log(lines.join('\n'))
}
