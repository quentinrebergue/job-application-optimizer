import type { RenderPayload } from './build-payload'

const DEFAULT_URL = 'http://localhost:8090'

// A little longer than the service's own 15 s render timeout, so the service
// answers (504) before we give up on it.
const DEFAULT_TIMEOUT_MS = 20_000

/**
 * A failure to get a PDF, already translated for the browser: `status` is the
 * HTTP status to answer with, `message` is safe to show to the user, `code` is
 * a stable identifier ('timeout', 'busy', ...) and `problems` lists what the
 * renderer rejected, when it said so.
 */
export class RenderError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly problems: string[] = [],
  ) {
    super(message)
    this.name = 'RenderError'
  }
}

export interface RendererClientOptions {
  baseUrl?: string
  timeoutMs?: number
  /** Replaces the global fetch. Lets tests run without a network. */
  fetchImpl?: typeof fetch
}

export async function renderPdf(payload: RenderPayload, options: RendererClientOptions = {}): Promise<ArrayBuffer> {
  const baseUrl = options.baseUrl ?? process.env.RESUME_RENDERER_URL ?? DEFAULT_URL
  const doFetch = options.fetchImpl ?? fetch

  let response: Response
  try {
    response = await doFetch(`${baseUrl}/render`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
      cache: 'no-store',
    })
  } catch (err) {
    if (err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError')) {
      throw new RenderError('The resume renderer took too long to answer.', 504, 'timeout')
    }
    throw new RenderError('The resume renderer is not reachable.', 503, 'renderer_unreachable')
  }

  if (response.ok) {
    if (!response.headers.get('Content-Type')?.startsWith('application/pdf')) {
      throw new RenderError('The resume renderer returned an unexpected response.', 502, 'bad_response')
    }
    return response.arrayBuffer()
  }
  throw await toRenderError(response)
}

interface ServiceError {
  error?: unknown
  problems?: unknown
}

async function toRenderError(response: Response): Promise<RenderError> {
  const body = (await response.json().catch(() => null)) as ServiceError | null
  const code = typeof body?.error === 'string' ? body.error : 'renderer_error'
  const problems = Array.isArray(body?.problems)
    ? body.problems.filter((p): p is string => typeof p === 'string')
    : []

  switch (response.status) {
    case 400:
      return new RenderError(`The renderer rejected the resume data: ${problems.join('; ') || code}`, 422, code, problems)
    case 404:
      return new RenderError('That resume template does not exist.', 400, code)
    case 413:
      return new RenderError('The resume is too large to render.', 413, code)
    case 429:
      return new RenderError('The renderer is busy, try again in a moment.', 429, code)
    case 504:
      return new RenderError('The render took too long.', 504, code)
    default:
      // Includes 422 (a built-in template failed to compile: our bug, not the user's) and 5xx.
      return new RenderError('The resume renderer failed.', 502, code)
  }
}
