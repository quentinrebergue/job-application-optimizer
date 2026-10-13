import { describe, it, expect } from 'vitest'
import { PdfTextError, readPdfText } from './text-client'

const PDF = new TextEncoder().encode('%PDF-1.7 a resume')

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

function recordingFetch(respond: () => Response | Promise<Response>) {
  const calls: { url: string; init: RequestInit }[] = []
  const fetchImpl: typeof fetch = async (input, init) => {
    calls.push({ url: String(input), init: init ?? {} })
    return respond()
  }
  return { calls, fetchImpl }
}

async function failure(fetchImpl: typeof fetch): Promise<PdfTextError> {
  try {
    await readPdfText(PDF, { baseUrl: 'http://pdf-text', fetchImpl, retryAfterMs: 0 })
  } catch (error) {
    expect(error).toBeInstanceOf(PdfTextError)
    return error as PdfTextError
  }
  throw new Error('expected readPdfText to fail')
}

describe('readPdfText', () => {
  it('posts the PDF as it is and returns the text', async () => {
    const { calls, fetchImpl } = recordingFetch(() => json(200, { text: 'Camille Moreau', pages: 2, pages_read: 2, truncated: false }))
    const result = await readPdfText(PDF, { baseUrl: 'http://pdf-text/', fetchImpl })
    expect(result).toEqual({ text: 'Camille Moreau', pages: 2, pagesRead: 2, truncated: false })
    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe('http://pdf-text/extract')
    expect(calls[0].init.method).toBe('POST')
    expect((calls[0].init.headers as Record<string, string>)['Content-Type']).toBe('application/pdf')
    expect(calls[0].init.body).toBe(PDF)
  })

  it('reads the address from PDF_TEXT_URL', async () => {
    const { calls, fetchImpl } = recordingFetch(() => json(200, { text: 'x', pages: 1, pages_read: 1, truncated: false }))
    process.env.PDF_TEXT_URL = 'http://from-env'
    try {
      await readPdfText(PDF, { fetchImpl })
    } finally {
      delete process.env.PDF_TEXT_URL
    }
    expect(calls[0].url).toBe('http://from-env/extract')
  })

  it.each([
    [413, 'payload_too_large', 413, /too large/],
    [415, 'not_a_pdf', 415, /not a PDF/],
    [422, 'no_text', 422, /No text found/],
    [422, 'unreadable', 422, /damaged or protected/],
    [503, 'busy', 503, /Try again in a moment/],
    [503, 'starting', 503, /Try again in a moment/],
    [504, 'timeout', 504, /took too long/],
    [500, 'internal_error', 502, /failed/],
  ])('turns the service answer %i %s into %i for the user', async (status, code, wantStatus, wantMessage) => {
    const error = await failure(recordingFetch(() => json(status, { error: code, message: 'words for the logs' })).fetchImpl)
    expect(error.status).toBe(wantStatus)
    expect(error.code).toBe(code)
    expect(error.message).toMatch(wantMessage)
    expect(error.message).not.toContain('words for the logs')
  })

  it('tries once more when the service could not be reached, and no more', async () => {
    let attempts = 0
    const fetchImpl: typeof fetch = async () => {
      attempts++
      throw new TypeError('fetch failed')
    }
    const error = await failure(fetchImpl)
    expect(attempts).toBe(2)
    expect(error.status).toBe(503)
    expect(error.code).toBe('reader_unreachable')
  })

  it('succeeds on the second try after a connection failure', async () => {
    let attempts = 0
    const fetchImpl: typeof fetch = async () => {
      if (++attempts === 1) throw new TypeError('fetch failed')
      return json(200, { text: 'ok', pages: 1, pages_read: 1, truncated: false })
    }
    expect((await readPdfText(PDF, { baseUrl: 'http://pdf-text', fetchImpl, retryAfterMs: 0 })).text).toBe('ok')
    expect(attempts).toBe(2)
  })

  it('does not try again after a timeout: the reading may have started', async () => {
    let attempts = 0
    const fetchImpl: typeof fetch = async () => {
      attempts++
      throw new DOMException('timed out', 'TimeoutError')
    }
    const error = await failure(fetchImpl)
    expect(attempts).toBe(1)
    expect(error.status).toBe(504)
  })

  it('refuses an answer that is not the text it expects', async () => {
    const error = await failure(recordingFetch(() => json(200, { nothing: true })).fetchImpl)
    expect(error.status).toBe(502)
    expect(error.code).toBe('bad_response')
  })
})
