/**
 * Client of the pdf-text service (services/pdf-text, #266): the text of a PDF, read by pdfium in a sandbox
 * of its own. Like the resume renderer's client, it turns every failure into an error with a status to
 * answer with and a message safe to show: the service's own words are for logs, and the text of a resume
 * is never in an error.
 */

const DEFAULT_URL = 'http://localhost:8095'

// A little longer than the service's own 5 s timeout, so the service answers (504) before we give up.
const TIMEOUT_MS = 8_000
// A pause before the second try, for a failure that never reached the service (a pod being replaced).
const RETRY_AFTER_MS = 500

export class PdfTextError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** A stable identifier ('no_text', 'busy', ...) the page can act on. */
    readonly code: string,
  ) {
    super(message)
    this.name = 'PdfTextError'
  }
}

export interface PdfText {
  text: string
  pages: number
  pagesRead: number
  /** True when the PDF has more pages than the service reads, or more text than it keeps. */
  truncated: boolean
}

export interface PdfTextOptions {
  baseUrl?: string
  timeoutMs?: number
  retryAfterMs?: number
  /** Replaces the global fetch. Lets tests run without a network. */
  fetchImpl?: typeof fetch
}

const isTimeout = (error: unknown) => error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')

export async function readPdfText(pdf: Uint8Array, options: PdfTextOptions = {}): Promise<PdfText> {
  const baseUrl = (options.baseUrl ?? process.env.PDF_TEXT_URL ?? DEFAULT_URL).replace(/\/$/, '')
  const doFetch = options.fetchImpl ?? fetch

  const send = () =>
    doFetch(`${baseUrl}/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/pdf' },
      body: pdf as BodyInit,
      signal: AbortSignal.timeout(options.timeoutMs ?? TIMEOUT_MS),
      cache: 'no-store',
    })

  let response: Response
  try {
    try {
      response = await send()
    } catch (error) {
      // One more try, only for a failure that never reached the service: a timeout may have started the reading.
      if (isTimeout(error)) throw error
      await new Promise((resolve) => setTimeout(resolve, options.retryAfterMs ?? RETRY_AFTER_MS))
      response = await send()
    }
  } catch (error) {
    if (isTimeout(error)) throw new PdfTextError('Reading the PDF took too long. Try again.', 504, 'timeout')
    throw new PdfTextError('The PDF reader is not reachable. Try again in a moment.', 503, 'reader_unreachable')
  }

  if (response.ok) {
    const body = (await response.json().catch(() => null)) as Record<string, unknown> | null
    if (!body || typeof body.text !== 'string') {
      throw new PdfTextError('The PDF reader returned an unexpected answer.', 502, 'bad_response')
    }
    return {
      text: body.text,
      pages: Number(body.pages) || 0,
      pagesRead: Number(body.pages_read) || 0,
      truncated: body.truncated === true,
    }
  }
  throw await toPdfTextError(response)
}

async function toPdfTextError(response: Response): Promise<PdfTextError> {
  const body = (await response.json().catch(() => null)) as { error?: unknown } | null
  const code = typeof body?.error === 'string' ? body.error : 'reader_error'

  switch (response.status) {
    case 413:
      return new PdfTextError('This PDF is too large (2 MB at most).', 413, code)
    case 415:
      return new PdfTextError('This file is not a PDF.', 415, code)
    case 422:
      return code === 'no_text'
        ? new PdfTextError('No text found in this PDF: it may be a picture. Export it again as a PDF with selectable text.', 422, code)
        : new PdfTextError('This PDF could not be read: it may be damaged or protected by a password.', 422, code)
    case 503:
      // "busy" (too many files at once) and "starting" (the reader is loading): both pass in a moment.
      return new PdfTextError('Too many files are being read at the moment. Try again in a moment.', 503, code)
    case 504:
      return new PdfTextError('Reading the PDF took too long. Try again.', 504, code)
    default:
      return new PdfTextError('The PDF reader failed.', 502, code)
  }
}
