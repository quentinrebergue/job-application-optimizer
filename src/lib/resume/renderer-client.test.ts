import { describe, it, expect, vi, afterEach } from 'vitest'
import type { RenderPayload } from './build-payload'
import { RenderError, renderPdf } from './renderer-client'

const payload: RenderPayload = {
  schema_version: 1,
  template: { id: 'classic' },
  options: {},
  profile: { name: 'Ada', title: '', email: '', linkedin: '', phone: '', address: '', summary: '' },
  sections: { experiences: [], projects: [], skills: [], education: [] },
}

const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]) // "%PDF-"

function pdfResponse() {
  return new Response(PDF, { status: 200, headers: { 'Content-Type': 'application/pdf' } })
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

async function failure(fetchImpl: typeof fetch): Promise<RenderError> {
  try {
    await renderPdf(payload, { baseUrl: 'http://renderer', fetchImpl })
  } catch (err) {
    expect(err).toBeInstanceOf(RenderError)
    return err as RenderError
  }
  throw new Error('expected renderPdf to fail')
}

afterEach(() => {
  vi.unstubAllEnvs()
})

// A fetch stand-in that remembers what it was called with.
function recordingFetch(respond: () => Response) {
  const calls: { url: string; init: RequestInit }[] = []
  const fetchImpl: typeof fetch = async (input, init) => {
    calls.push({ url: String(input), init: init ?? {} })
    return respond()
  }
  return { fetchImpl, calls }
}

describe('renderPdf', () => {
  it('posts the payload as JSON and returns the PDF bytes', async () => {
    const { fetchImpl, calls } = recordingFetch(pdfResponse)

    const bytes = await renderPdf(payload, { baseUrl: 'http://renderer:9000', fetchImpl })

    expect(Array.from(new Uint8Array(bytes))).toEqual(Array.from(PDF))
    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe('http://renderer:9000/render')
    expect(calls[0].init.method).toBe('POST')
    expect(JSON.parse(calls[0].init.body as string)).toEqual(payload)
    expect(calls[0].init.signal).toBeInstanceOf(AbortSignal)
  })

  it('reads the service address from RESUME_RENDERER_URL', async () => {
    vi.stubEnv('RESUME_RENDERER_URL', 'http://from-env:1234')
    const { fetchImpl, calls } = recordingFetch(pdfResponse)

    await renderPdf(payload, { fetchImpl })

    expect(calls[0].url).toBe('http://from-env:1234/render')
  })

  it('rejects a 200 that is not a PDF', async () => {
    const err = await failure(async () => new Response('<html>oops</html>', { status: 200, headers: { 'Content-Type': 'text/html' } }))
    expect(err.status).toBe(502)
    expect(err.code).toBe('bad_response')
  })
})

describe('renderPdf errors', () => {
  it('turns a 400 into a 422 that lists what was rejected', async () => {
    const err = await failure(async () =>
      jsonResponse(400, { error: 'invalid_options', problems: ['options.fontSize must be at most 12', 'options.nope is not an option'] }),
    )
    expect(err.status).toBe(422)
    expect(err.code).toBe('invalid_options')
    expect(err.problems).toHaveLength(2)
    expect(err.message).toContain('options.fontSize must be at most 12')
  })

  it.each([
    [404, 400, 'unknown_template'],
    [413, 413, 'payload_too_large'],
    [429, 429, 'busy'],
    [504, 504, 'render_timeout'],
    [422, 502, 'template_error'],
    [500, 502, 'internal_error'],
  ])('maps a service %i to %i', async (serviceStatus, wantStatus, code) => {
    const err = await failure(async () => jsonResponse(serviceStatus, { error: code }))
    expect(err.status).toBe(wantStatus)
    expect(err.code).toBe(code)
  })

  it('never leaks the service diagnostics in the message', async () => {
    const err = await failure(async () => jsonResponse(422, { error: 'template_error', message: 'error: file /tmp/render-123/main.typ' }))
    expect(err.message).not.toContain('/tmp/')
  })

  it('copes with an error body that is not JSON', async () => {
    const err = await failure(async () => new Response('Bad Gateway', { status: 502 }))
    expect(err.status).toBe(502)
    expect(err.code).toBe('renderer_error')
    expect(err.problems).toEqual([])
  })

  it('reports an unreachable renderer as a 503', async () => {
    const err = await failure(async () => {
      throw new TypeError('fetch failed')
    })
    expect(err.status).toBe(503)
    expect(err.code).toBe('renderer_unreachable')
  })

  it('gives up after the timeout and reports a 504', async () => {
    const never: typeof fetch = (_url, init) =>
      new Promise((_resolve, reject) => {
        init!.signal!.addEventListener('abort', () => reject(init!.signal!.reason))
      })

    const err = await (async () => {
      try {
        await renderPdf(payload, { baseUrl: 'http://renderer', fetchImpl: never, timeoutMs: 20 })
      } catch (e) {
        return e as RenderError
      }
      throw new Error('expected a timeout')
    })()

    expect(err.status).toBe(504)
    expect(err.code).toBe('timeout')
  })
})
