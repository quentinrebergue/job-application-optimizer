import bcrypt from 'bcryptjs'
import { BusyError, limitConcurrency } from '@/lib/concurrency'
import { envNumber } from '@/lib/env'

export const SALT_ROUNDS = 12

// bcryptjs computes on the main thread of Node: forty checks at once freeze the whole application (health probes
// included) for seconds. Two at a time give the same throughput without the freeze; the others wait, and past
// BCRYPT_QUEUE waiting a check is refused with a BusyError (#225).
const slots = limitConcurrency(envNumber('BCRYPT_CONCURRENCY', 2), envNumber('BCRYPT_QUEUE', 150))

// ---- The password-hasher service (#254) --------------------------------------------------------------------
//
// With PASSWORD_HASHER_URL set, the hashing is done by the small service of the cluster, so that the thread that
// serves the pages does not spend a quarter of a second of CPU on each login. Unset (the tests, a laptop), the
// hashing is done here as before.
//
// The service is asked twice at most. A service that is full (503) is a BusyError, like a full queue here: the
// visitor is told to try again, and hashing here would only bring back the freeze the service is there to avoid.
// A service that is down, too slow or that answers nonsense is another case: sign-in and sign-up must not stop
// for it, so the hashing is done here, slower, as it was before. Nothing here ever logs a password or a hash.

const HASHER_TIMEOUT_MS = 10_000
const RETRY_DELAY_MS = 200

/** The service did not do its job (down, too slow, a bad answer): the hashing is done here instead. */
class HasherDown extends Error {}

/** A bcrypt hash as the service and bcryptjs make them: 60 characters, "$2a$12$..." */
const looksLikeBcrypt = (value: unknown): value is string => typeof value === 'string' && /^\$2[aby]\$\d\d\$[./A-Za-z0-9]{53}$/.test(value)

const hasherUrl = () => process.env.PASSWORD_HASHER_URL?.trim().replace(/\/$/, '') || null

/** One call to the service: the answer read by `parse` (undefined when it is not the expected one). */
async function callService<T>(url: string, path: string, body: object, parse: (json: unknown) => T | undefined, whenInvalidHash?: T): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${url}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(HASHER_TIMEOUT_MS),
      cache: 'no-store',
    })
  } catch {
    throw new HasherDown('unreachable')
  }
  if (res.status === 503) throw new BusyError()
  // A stored hash that is not a bcrypt hash is no password match, as it was with bcryptjs.
  if (res.status === 422 && whenInvalidHash !== undefined) return whenInvalidHash
  if (!res.ok) throw new HasherDown(`status ${res.status}`)
  const value = parse(await res.json().catch(() => undefined))
  if (value === undefined) throw new HasherDown('unexpected answer')
  return value
}

/** Asks the service, once more after a short pause; if it still fails, does the job here. */
async function viaService<T>(path: string, body: object, parse: (json: unknown) => T | undefined, here: () => Promise<T>, whenInvalidHash?: T): Promise<T> {
  const url = hasherUrl()
  if (!url) return here()
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      return await callService(url, path, body, parse, whenInvalidHash)
    } catch (err) {
      if (!(err instanceof HasherDown)) throw err
      if (attempt === 1) await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
    }
  }
  console.warn('password-hasher is not answering, hashing in the app instead')
  return here()
}

export async function hashPassword(plain: string): Promise<string> {
  return slots(() =>
    viaService(
      '/hash',
      { password: plain },
      (json) => (json && typeof json === 'object' && looksLikeBcrypt((json as { hash?: unknown }).hash) ? (json as { hash: string }).hash : undefined),
      () => bcrypt.hash(plain, SALT_ROUNDS),
    ),
  )
}

/**
 * A valid hash (12 rounds, of a random secret nobody has) checked when the address has no account, so that
 * answering "wrong email or password" takes as long as for a wrong password on a real account: the time
 * of the answer does not tell which addresses have an account (#225).
 */
export const UNKNOWN_ACCOUNT_HASH = '$2b$12$h23tUPs/mlkKgnpIFMAEK.gS8LC.lGAZ2YYblCg.4g8BzYRSnXuoy'

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return slots(() =>
    viaService(
      '/verify',
      { password: plain, hash },
      (json) => (json && typeof json === 'object' && typeof (json as { valid?: unknown }).valid === 'boolean' ? (json as { valid: boolean }).valid : undefined),
      () => bcrypt.compare(plain, hash),
      false,
    ),
  )
}
