// fetch() resolves even when the server answers 4xx/5xx. This helper turns those
// answers into errors, with the server's `error` message when it sends one, so
// callers can show them instead of failing silently (#77).

export class HttpError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
    this.name = 'HttpError'
  }
}

async function errorMessage(res: Response): Promise<string> {
  try {
    const body = await res.json()
    if (body && typeof body.error === 'string') return body.error
  } catch {
    // not JSON: fall through to the generic message
  }
  return `Request failed (${res.status}). Try again.`
}

/** Sends a request and returns the JSON body; throws HttpError when the response is not ok. */
export async function fetchJson<T = unknown>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {}
  const res = await fetch(url, json === undefined ? rest : {
    ...rest,
    headers: { 'Content-Type': 'application/json', ...rest.headers },
    body: JSON.stringify(json),
  })
  if (!res.ok) throw new HttpError(await errorMessage(res), res.status)
  if (res.status === 204) return undefined as T
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}
