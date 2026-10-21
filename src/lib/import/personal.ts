// The details of a person in the text of a resume, found by code, never by the AI (#110): the name, the email
// address, the phone number, the links of profiles and the date of birth. They fill the resume profile, and they are
// replaced in the text before it is sent to the AI, which therefore never receives them.
//
// The email, the phone and the links have a shape a pattern finds. A name has none: it is found as the line whose
// words are in the email address ("louis.rodet@" -> "Louis Rodet"), or else as a short line of capitalised words at
// the top. Measured on 9 real resumes: 9 names, 9 emails, every phone and link written with its site. It remains a
// heuristic: a resume without an email whose name is not at the top can keep its name.

export const PLACEHOLDER = {
  name: '[name]',
  email: '[email]',
  phone: '[phone]',
  link: '[link]',
  birth: '[date of birth]',
} as const

export interface Personal {
  full_name?: string
  email?: string
  phone?: string
  linkedin?: string
}

export interface Redacted {
  /** What was found, to fill the profile. */
  personal: Personal
  /** The text with every one of them replaced by its placeholder: what the AI may read. */
  text: string
}

const EMAIL = /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)+/gu
// The sites of a person's profiles, with or without "https://www.": a link to a project on them names the person too.
const PROFILE_LINK = /(?:https?:\/\/)?(?:www\.)?(?:linkedin\.com|github\.com|gitlab\.com|codeberg\.org|bitbucket\.org|x\.com|twitter\.com)\/[^\s,;|)]*/giu
// "LinkedIn: JeremyGomes": a handle after the name of the site and a colon, on the same line. Without the colon it
// is a word of the text ("GitHub Actions", "Twitter backend").
const HANDLE = /\b(linkedin|github|gitlab|codeberg|twitter)([ \t]*[:@][ \t]*)([\p{L}\p{N}._-]{3,})/giu
// A run of digits with spaces, dots, dashes or brackets, an optional "+country" first; kept when it holds 9 to 15 digits.
const PHONE = /(?<![\p{L}\p{N}])(?:\+\s?\d{1,3}[\s.-]?)?(?:\(?\d{1,4}\)?[\s.-]?){2,6}\d{2,4}(?![\p{L}\p{N}])/gu
// "Date of birth 05/12/2003", "Né le ; 29/10/2006 à Toulouse": the label and the rest of the line.
const BIRTH = /\b(date of birth|birth date|born on|date de naissance|n[ée]e? le)\b[^\n]*/giu

const plain = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
const lettersOf = (s: string) => plain(s).replace(/[^a-z]/g, '')
const wordsOf = (s: string) => s.match(/[\p{L}]+(?:[-'’][\p{L}]+)*/gu) ?? []

function digitsOf(s: string): number {
  return (s.match(/\d/g) ?? []).length
}

/** The line that is the person's name, or nothing. */
export function findName(lines: string[], email: string | undefined): string | undefined {
  const candidates = lines.filter((l) => !l.includes('@') && digitsOf(l) === 0)
  if (email) {
    const local = lettersOf(email.split('@')[0])
    for (const line of candidates) {
      const words = wordsOf(line)
      if (words.length < 2 || words.length > 5) continue
      const inEmail = words.filter((w) => lettersOf(w).length >= 2 && local.includes(lettersOf(w)))
      const joined = lettersOf(line)
      if (inEmail.length >= 2 || (joined.length >= 6 && local.includes(joined))) return line
    }
  }
  // No email, or no line in it: a short line of capitalised words among the first ones.
  for (const line of candidates.slice(0, 5)) {
    const words = wordsOf(line)
    if (words.length >= 2 && words.length <= 4 && line.length <= 40 && words.every((w) => /^\p{Lu}/u.test(w))) return line
  }
  return undefined
}

/** Finds the details of the person, and replaces them everywhere in the text. */
export function redactPersonal(text: string): Redacted {
  const personal: Personal = {}
  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l !== '')

  const email = text.match(EMAIL)?.[0]
  if (email) personal.email = email
  const linkedin = text.match(PROFILE_LINK)?.find((l) => /linkedin/i.test(l))
  const linkedinHandle = [...text.matchAll(HANDLE)].find((m) => m[1].toLowerCase() === 'linkedin')?.[3]
  if (linkedin) personal.linkedin = linkedin
  else if (linkedinHandle) personal.linkedin = linkedinHandle
  const phone = (text.match(PHONE) ?? []).map((p) => p.trim()).find((p) => digitsOf(p) >= 9 && digitsOf(p) <= 15)
  if (phone) personal.phone = phone
  const name = findName(lines, email)
  if (name) personal.full_name = name.replace(/\s+/g, ' ')

  return { personal, text: redactDetails(text, name) }
}

/**
 * The text with its details replaced by placeholders: what has a shape (email, links, phone, date of birth) wherever
 * it is, and `name` (given, never guessed) in every form. `redactPersonal` guesses the name; a text that is not a
 * whole resume (a title, a profile) is given the name of the profile instead, since "Platform Engineer" looks like a name.
 */
export function redactDetails(text: string, name?: string): string {
  let out = text
    .replace(EMAIL, PLACEHOLDER.email)
    .replace(PROFILE_LINK, PLACEHOLDER.link)
    .replace(HANDLE, (_m, site: string, sep: string) => `${site}${sep}${PLACEHOLDER.link}`)
    .replace(PHONE, (p) => (digitsOf(p) >= 9 && digitsOf(p) <= 15 ? PLACEHOLDER.phone : p))
    .replace(BIRTH, (_m, label: string) => `${label} ${PLACEHOLDER.birth}`)

  if (name) {
    // The line as written, then each word of the name of 3 letters or more, wherever it is (a handle, a signature),
    // with or without its accents. Shorter words ("Al", "En") are common words too: only the whole line takes them.
    out = out.split(name).join(PLACEHOLDER.name)
    for (const word of new Set(wordsOf(name).flatMap((w) => w.split(/[-'’]/)).filter((w) => w.length >= 3))) {
      for (const form of new Set([word, plain(word)])) {
        const escaped = form.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        out = out.replace(new RegExp(`(?<![\\p{L}])${escaped}(?![\\p{L}])`, 'giu'), PLACEHOLDER.name)
      }
    }
  }
  return out
}

/**
 * Whether a text holds a detail of a person, or a placeholder this file leaves in its place: an email address, a link to a
 * profile, a phone number, a date of birth, `[name]` and the others. Used on what the AI writes (#294), which must hold
 * none. The name is not looked for: a name has no shape, and a title such as "Platform Engineer" looks like one.
 */
export function containsPersonal(text: string): boolean {
  if (Object.values(PLACEHOLDER).some((placeholder) => text.includes(placeholder))) return true
  if (text.match(EMAIL) || text.match(PROFILE_LINK) || text.match(/\bhttps?:\/\/|\bwww\./i)) return true
  if ([...text.matchAll(HANDLE)].length > 0 || text.match(BIRTH)) return true
  return (text.match(PHONE) ?? []).some((p) => digitsOf(p) >= 9 && digitsOf(p) <= 15)
}
