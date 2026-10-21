/**
 * The details of the person that a request to the AI still holds: none, or a leak (#294). The title and the profile of
 * a case may name the person; code takes the name, the email and the phone out before they are sent, and this checks it.
 */
export interface Person {
  fullName?: string
  email?: string
  phone?: string
}

const plain = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export function findLeaks(person: Person | undefined, request: string): string[] {
  if (!person) return []
  const sent = plain(request)
  const leaks: string[] = []
  for (const word of (person.fullName ?? '').split(/[\s-]+/).filter((w) => w.length >= 3)) {
    if (new RegExp(`(?<![\\p{L}])${escape(plain(word))}(?![\\p{L}])`, 'u').test(sent)) leaks.push(`the name (${word})`)
  }
  if (person.email && sent.includes(plain(person.email))) leaks.push('the email')
  const digits = (person.phone ?? '').replace(/\D/g, '')
  if (digits.length >= 6 && sent.replace(/\D/g, '').includes(digits)) leaks.push('the phone')
  return leaks
}
