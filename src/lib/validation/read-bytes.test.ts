import { describe, it, expect } from 'vitest'
import { looksLikePdf, readBytes } from './read-bytes'

const post = (body: BodyInit | null, headers: Record<string, string> = {}) => new Request('http://x', { method: 'POST', body, headers })

describe('readBytes', () => {
  it('reads a body that fits', async () => {
    expect(Array.from((await readBytes(post(new Uint8Array([1, 2, 3])), 10))!)).toEqual([1, 2, 3])
  })

  it('reads an empty body as no bytes', async () => {
    expect((await readBytes(post(null), 10))!.byteLength).toBe(0)
  })

  it('refuses a body that declares more than the limit without reading it', async () => {
    const request = post('x', { 'content-length': '11' })
    expect(await readBytes(request, 10)).toBeNull()
    expect(request.bodyUsed).toBe(false)
  })

  it('stops reading a body that goes over the limit though it declared nothing', async () => {
    const stream = new ReadableStream({
      pull(controller) {
        controller.enqueue(new Uint8Array(6))
      },
    })
    const request = new Request('http://x', { method: 'POST', body: stream, duplex: 'half' } as RequestInit)
    expect(await readBytes(request, 10)).toBeNull()
  })
})

describe('looksLikePdf', () => {
  it('goes by the first bytes, not by a name or a declared type', () => {
    expect(looksLikePdf(new TextEncoder().encode('%PDF-1.7\n...'))).toBe(true)
    expect(looksLikePdf(new TextEncoder().encode('   \n%PDF-1.4'))).toBe(true)
    expect(looksLikePdf(new TextEncoder().encode('<html>%PDF-</html>'.padStart(2000, ' ')))).toBe(false)
    expect(looksLikePdf(new TextEncoder().encode('PK\u0003\u0004 a zip'))).toBe(false)
    expect(looksLikePdf(new Uint8Array(0))).toBe(false)
  })
})
