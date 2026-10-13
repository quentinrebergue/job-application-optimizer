// The body of a request as bytes, for a file (#267). Next.js does not cap the size of a body: a big one
// is refused while it is read, before it is kept, like read-json.ts does for JSON.

/** The body, or null once it goes over `maxBytes` (the rest is not read). */
export async function readBytes(request: Request, maxBytes: number): Promise<Uint8Array | null> {
  const declared = Number(request.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > maxBytes) return null
  if (!request.body) return new Uint8Array(0)
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > maxBytes) {
      await reader.cancel()
      return null
    }
    chunks.push(value)
  }
  return new Uint8Array(Buffer.concat(chunks))
}

/** A PDF starts with "%PDF-" (the service looks in the first 1,024 bytes, some files have a few bytes before it). */
export function looksLikePdf(bytes: Uint8Array): boolean {
  return Buffer.from(bytes.subarray(0, 1024)).includes('%PDF-')
}
