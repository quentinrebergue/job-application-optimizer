// The password-hasher service (#254): what the app does with its answers. fetch is replaced by a fake; the
// fallback uses the real bcryptjs (a quarter of a second a hash, so few tests reach it).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import bcrypt from 'bcryptjs'
import { BusyError } from '@/lib/concurrency'
import { hashPassword, verifyPassword } from './password'

const SERVICE_HASH = '$2a$12$' + 'A'.repeat(53)

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

let fetchMock: ReturnType<typeof vi.fn>
let warn: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.stubEnv('PASSWORD_HASHER_URL', 'http://password-hasher/')
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('with the service', () => {
  it('hashes through the service: one POST to /hash with the password, the service\'s hash back', async () => {
    fetchMock.mockResolvedValue(json({ hash: SERVICE_HASH }))
    expect(await hashPassword('mySecret123')).toBe(SERVICE_HASH)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://password-hasher/hash')
    expect(JSON.parse(init.body)).toEqual({ password: 'mySecret123' })
    expect(init.signal).toBeInstanceOf(AbortSignal) // never waits for ever
  })

  it('checks through the service: the password and the hash, the verdict back, both ways', async () => {
    fetchMock.mockResolvedValueOnce(json({ valid: true })).mockResolvedValueOnce(json({ valid: false }))
    expect(await verifyPassword('right', SERVICE_HASH)).toBe(true)
    expect(await verifyPassword('wrong', SERVICE_HASH)).toBe(false)
    expect(fetchMock.mock.calls[0][0]).toBe('http://password-hasher/verify')
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ password: 'right', hash: SERVICE_HASH })
  })

  it('reads a stored hash that is not a bcrypt hash (422) as no match, like bcryptjs did', async () => {
    fetchMock.mockResolvedValue(json({ error: 'invalid_hash' }, 422))
    expect(await verifyPassword('x', 'junk')).toBe(false)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('tells the visitor to try again when the service is full (503): no second try, no hashing here', async () => {
    fetchMock.mockResolvedValue(json({ error: 'busy' }, 503))
    await expect(verifyPassword('x', SERVICE_HASH)).rejects.toBeInstanceOf(BusyError)
    await expect(hashPassword('x')).rejects.toBeInstanceOf(BusyError)
    expect(fetchMock).toHaveBeenCalledTimes(2) // one call each
  })

  it('asks again once when the service fails the first time', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed')).mockResolvedValueOnce(json({ hash: SERVICE_HASH }))
    expect(await hashPassword('x')).toBe(SERVICE_HASH)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(warn).not.toHaveBeenCalled()
  })
})

describe('when the service does not do its job, sign-in goes on in the app', () => {
  it('hashes and checks here after two failures, and says so without the password', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'))
    const hash = await hashPassword('mySecret123')
    expect(await bcrypt.compare('mySecret123', hash)).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(await verifyPassword('mySecret123', hash)).toBe(true)
    expect(await verifyPassword('other', hash)).toBe(false)
    const said = JSON.stringify(warn.mock.calls)
    expect(said).toContain('password-hasher')
    expect(said).not.toContain('mySecret123')
    expect(said).not.toContain(hash)
  })

  it.each([
    ['an error 500', () => json({ error: 'internal_error' }, 500)],
    ['an answer that is not JSON', () => new Response('<html>', { status: 200 })],
    ['a hash that is not a bcrypt hash', () => json({ hash: 'not-a-hash' })],
    ['a verdict that is not a boolean', () => json({ valid: 'yes' })],
  ])('does the same after %s', async (_name, answer) => {
    fetchMock.mockImplementation(async () => answer())
    const hash = await bcrypt.hash('pw', 4)
    expect(await verifyPassword('pw', hash)).toBe(true)
    expect(await verifyPassword('nope', hash)).toBe(false)
  })
})

describe('without the service', () => {
  it('hashes here and never calls out when PASSWORD_HASHER_URL is not set', async () => {
    vi.stubEnv('PASSWORD_HASHER_URL', '')
    const hash = await hashPassword('mySecret123')
    expect(await verifyPassword('mySecret123', hash)).toBe(true)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
