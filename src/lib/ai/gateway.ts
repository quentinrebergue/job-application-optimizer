/**
 * Client of the AI gateway (services/ai-gateway, #44): the only place the app
 * talks to an AI. The gateway owns the provider, the key, the limits and the
 * accounting; the app only sends a prompt and gets a JSON document back.
 */

export class AiGatewayError extends Error {
  /** Why the gateway refused (`prompt_too_large`, ...), when it said. */
  readonly code?: string

  constructor(message: string, readonly status: number, options?: { cause?: unknown; code?: string }) {
    super(message, options)
    this.name = 'AiGatewayError'
    this.code = options?.code
  }
}

export interface GatewayRequest {
  feature: 'rank'
  userId: string
  system: string
  prompt: string
  /** A JSON Schema the answer must follow: the model cannot write anything it does not allow. */
  schema?: object
  /** 'text': the answer is not JSON (no schema); the gateway returns the text as it came. */
  format?: 'text'
}

export interface GatewayAnswer {
  content: unknown
  usage: { prompt_tokens: number; completion_tokens: number }
}

// A bit above the gateway's own timeout (120 s), so the gateway answers first.
const TIMEOUT_MS = 125_000

/**
 * What the user reads. The gateway's `error` text is for logs; its `code` says why it refused.
 * A 413 without a code (an older gateway) is still a prompt that is too long.
 */
function messageFor(status: number, code: string | undefined, gatewayMessage: string | undefined): string {
  if (code === 'prompt_too_large' || (status === 413 && !code)) {
    return 'Your content is too long to guarantee a reliable answer. Please shorten it.'
  }
  switch (status) {
    case 429:
      return gatewayMessage ?? 'The AI limit is reached for now. Try again later.'
    case 504:
      return 'The AI took too long to answer. Try again.'
    default:
      return 'The AI is unavailable right now. Try again in a moment.'
  }
}

export async function askGateway(request: GatewayRequest): Promise<GatewayAnswer> {
  const baseUrl = process.env.AI_GATEWAY_URL
  if (!baseUrl) throw new AiGatewayError('The AI is not configured on this server.', 503)

  let res: Response
  try {
    res = await fetch(`${baseUrl.replace(/\/$/, '')}/v1/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        feature: request.feature,
        user_id: request.userId,
        system: request.system,
        prompt: request.prompt,
        ...(request.schema ? { schema: request.schema } : {}),
        ...(request.format ? { format: request.format } : {}),
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch (error) {
    console.error('AI gateway unreachable:', error)
    const timedOut = error instanceof Error && error.name === 'TimeoutError'
    throw new AiGatewayError(messageFor(timedOut ? 504 : 502, undefined, undefined), timedOut ? 504 : 502, { cause: error })
  }

  const body = (await res.json().catch(() => null)) as (Partial<GatewayAnswer> & { error?: string; code?: string }) | null
  if (!res.ok || !body || body.content === undefined || !body.usage) {
    console.error('AI gateway error:', res.status, body?.error)
    throw new AiGatewayError(messageFor(res.status, body?.code, body?.error), res.ok ? 502 : res.status, { code: body?.code })
  }
  return { content: body.content, usage: body.usage }
}
