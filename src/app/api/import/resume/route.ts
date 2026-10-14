import { getSessionUserId } from '@/lib/auth/session'
import { findUserById } from '@/lib/data/users'
import { MAX_BODY_BYTES } from '@/config/limits'
import { consumeCreation } from '@/lib/quotas'
import { looksLikePdf, readBytes } from '@/lib/validation/read-bytes'
import { PdfTextError, readPdfText } from '@/lib/pdf/text-client'
import { askGateway, AiGatewayError } from '@/lib/ai/gateway'
import { aiLimits } from '@/lib/ai/limits'
import { debugExchange } from '@/lib/ai/debug'
import { reserveAiCall, settleAiCall } from '@/lib/ai/usage'
import { outcomeOfFailure } from '@/lib/ai/failure'
import { IMPORT_SCHEMA, IMPORT_SYSTEM_PROMPT, IMPORT_TYPES, buildImportPrompt, parseImportAnswer } from '@/lib/ai/import-prompt'
import { saveImportedEntries, saveImportedProfile } from '@/lib/import/save'
import { redactPersonal } from '@/lib/import/personal'
import { cleanText } from '@/lib/import/clean'
import { ResumeProfileSchema } from '@/schemas/resume-profile'

// Import a resume (#267): a PDF in, entries in the library out. The body is the PDF itself.
// The steps, cheapest first, so a refused file costs nothing:
//   the session and a confirmed address (the AI costs money) -> the size and the first bytes ->
//   the limit of imports -> the text of the PDF (pdf-text) -> the name, email, phone, links and date of birth taken
//   out of it -> the limits of the AI -> the AI turns
//   the text into entries -> every entry is checked against the text -> what is new is saved, and the profile is
//   filled where it is empty. The answer holds the entries created, so the user can check and fix them (#281).
// The file is never written to disk, and neither the file nor its text is kept or logged: they are
// personal data. Only the entries the user can see and delete in the library are saved.

const reply = (error: string, status: number, code?: string, headers?: HeadersInit) =>
  Response.json({ error, ...(code ? { code } : {}) }, { status, headers })

export async function POST(request: Request) {
  const userId = await getSessionUserId()
  if (!userId) return reply('Unauthorized', 401)

  // The AI costs money: only confirmed accounts use it (#125).
  const user = await findUserById(userId)
  if (!user?.emailVerified) {
    return reply('Confirm your email address to import a resume: open the link we sent you, or send a new one from the banner at the top.', 403, 'email_not_confirmed')
  }

  const pdf = await readBytes(request, MAX_BODY_BYTES.resumePdf)
  if (pdf === null) return reply('This PDF is too large (2 MB at most).', 413, 'payload_too_large')
  if (!looksLikePdf(pdf)) return reply('This file is not a PDF.', 415, 'not_a_pdf')

  // Counted before the reader: a file that holds no text costs the reader some CPU too.
  const limited = await consumeCreation(userId, 'import')
  if (limited) return limited

  try {
    let read
    try {
      read = await readPdfText(pdf)
    } catch (error) {
      if (error instanceof PdfTextError) return reply(error.message, error.status, error.code)
      throw error
    }

    debugExchange('import, read by pdf-text', { pages: `${read.pagesRead} of ${read.pages}, cut: ${read.truncated}`, text: read.text })
    // The name, email, phone, links and date of birth are found by code and taken out of the text: the AI never
    // receives them, and they fill the profile from here.
    // The debris of the PDF (a comma alone on a line, a page number) is taken out first: none of it is the resume.
    const { personal, text: redacted } = redactPersonal(cleanText(read.text))
    const { prompt, lines } = buildImportPrompt(redacted)
    if ([...IMPORT_SYSTEM_PROMPT].length + [...prompt].length > aiLimits().maxPromptChars) {
      return reply('This resume holds too much text to import. Try a shorter PDF.', 413, 'prompt_too_large')
    }

    // The limits (per user, and the site's monthly cap) are checked and the call is written down before the
    // AI is asked; it is settled with the real tokens, or as a failure (#203).
    const reservation = await reserveAiCall(userId, 'import')
    if (reservation.denied) {
      return reply(reservation.message, reservation.status, reservation.code, reservation.retryAfterSeconds ? { 'Retry-After': String(reservation.retryAfterSeconds) } : undefined)
    }

    debugExchange('import, sent', { system: IMPORT_SYSTEM_PROMPT, prompt })
    let answer
    try {
      answer = await askGateway({ feature: 'import', userId, system: IMPORT_SYSTEM_PROMPT, prompt, schema: IMPORT_SCHEMA })
    } catch (error) {
      await settleAiCall(reservation, outcomeOfFailure(error))
      throw error
    }
    await settleAiCall(reservation, {
      status: 'done',
      model: answer.model,
      promptTokens: answer.usage.prompt_tokens,
      completionTokens: answer.usage.completion_tokens,
    })

    const parsed = parseImportAnswer(answer.content, lines)
    const { entries, dropped } = parsed
    const found = Object.fromEntries(
      Object.entries(personal).filter(([field, value]) => ResumeProfileSchema.shape[field as keyof typeof personal].safeParse(value).success),
    )
    const profile = { ...found, ...parsed.profile }
    debugExchange('import, received', { model: answer.model, usage: answer.usage, answer: answer.content, kept: { profile, ...entries }, dropped })
    if (IMPORT_TYPES.every((type) => entries[type].length === 0) && Object.keys(profile).length === 0) {
      return reply('No experience, project, education or skill could be read in this resume.', 422, 'nothing_found')
    }

    const { summary, created, existing } = await saveImportedEntries(userId, entries)
    // The profile is filled only where it is empty: what the user typed stays.
    const { filled: profileFilled, different: profileFound } = await saveImportedProfile(userId, profile)
    return Response.json({ summary, entries: created, existing, profile: profileFilled, profileFound, dropped, truncated: read.truncated })
  } catch (error) {
    // Never the text, the file or an error message that could carry them: what happened, and nothing else.
    console.error('resume import failed', error instanceof Error ? error.name : 'unknown error')
    if (error instanceof AiGatewayError) return reply(error.message, error.status, error.code)
    return reply('The import failed. Try again.', 500, 'import_failed')
  }
}
