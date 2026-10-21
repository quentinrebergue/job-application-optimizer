import { LIMITS } from '@/config/limits'
import { cleanText } from '@/lib/import/clean'
import { containsPersonal, redactDetails } from '@/lib/import/personal'

// The two texts that open a resume, the title and the profile, in the ranking (#294): what the AI may read of them,
// and what is kept of what it proposes. The AI is asked to change only what is tied to the offer; the code does not
// trust it to leave the person out, nor to invent nothing.

export interface Header {
  title: string
  profile: string
}

/**
 * The header as the AI may read it: cleaned like an imported resume, with the name (the one of the profile), the email
 * address, the phone number, the links and the date of birth replaced by placeholders. The profile of the user is never
 * sent as written.
 */
export function headerForPrompt(header: Header, fullName?: string): Header {
  const safe = (text: string) => redactDetails(cleanText(text), fullName?.trim() || undefined).trim()
  return { title: safe(header.title).replace(/\s+/g, ' '), profile: safe(header.profile) }
}

export interface Proposal {
  title?: string
  profile?: string
  /** Capitalised words and numbers of the proposal found nowhere in what the AI was given: shown to the user to check. */
  titleNewTerms: string[]
  profileNewTerms: string[]
  /** What the AI wrote and the code refused (a detail of the person, a text too long): counted, never shown. */
  dropped: ('title' | 'profile')[]
}

const WORD = /[\p{L}\p{N}][\p{L}\p{N}+#./-]*/gu
const MAX_NEW_TERMS = 8

const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
const squash = (s: string) => s.replace(/\s+/g, ' ').trim()

/**
 * The capitalised words and the numbers of a text that `known` does not hold, in the order they come. A word that
 * opens a sentence is capitalised anyway: it only counts when it holds a digit. Not proof of an invention (a synonym of
 * a word of the offer shows up too): a reason to look.
 */
export function newTerms(text: string, known: string): string[] {
  const seen = new Set((fold(known).match(WORD) ?? []).map((w) => w.replace(/[.,/-]+$/, '')))
  const found: string[] = []
  for (const match of text.matchAll(WORD)) {
    const word = match[0].replace(/[.,/-]+$/, '')
    const before = text.slice(0, match.index).trimEnd()
    const opensSentence = before === '' || /[.!?:]$/.test(before)
    const hasDigit = /\d/.test(word)
    const capitalised = /^\p{Lu}/u.test(word)
    if (!(hasDigit || (capitalised && !opensSentence))) continue
    if (seen.has(fold(word)) || found.includes(word)) continue
    found.push(word)
  }
  return found.slice(0, MAX_NEW_TERMS)
}

/** One text of the answer: nothing, or what is kept (never the original unchanged, never what holds a detail of the person). */
function keep(raw: unknown, original: string, max: number, oneLine: boolean): { text?: string; dropped: boolean } {
  if (typeof raw !== 'string') return { dropped: false }
  const text = oneLine ? squash(raw) : raw.trim()
  if (text === '' || squash(text) === squash(original)) return { dropped: false }
  if (containsPersonal(text) || [...text].length > max) return { dropped: true }
  return { text, dropped: false }
}

/**
 * The proposal of the AI for the header of one offer, checked. `original` is what the user wrote (not what was
 * sent); `known` is everything the AI was given to write from (the library, the offer, the original), against which
 * the new words are listed.
 */
export function checkProposal(answer: { title?: unknown; profile?: unknown }, original: Header, known: string): Proposal {
  const title = keep(answer.title, original.title, LIMITS.profile.resume_title, true)
  const profile = keep(answer.profile, original.profile, LIMITS.profile.profile_text, false)
  const sources = `${known}\n${original.title}\n${original.profile}`
  return {
    ...(title.text !== undefined ? { title: title.text } : {}),
    ...(profile.text !== undefined ? { profile: profile.text } : {}),
    titleNewTerms: title.text ? newTerms(title.text, sources) : [],
    profileNewTerms: profile.text ? newTerms(profile.text, sources) : [],
    dropped: [...(title.dropped ? (['title'] as const) : []), ...(profile.dropped ? (['profile'] as const) : [])],
  }
}
