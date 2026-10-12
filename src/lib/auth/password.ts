import bcrypt from 'bcryptjs'
import { limitConcurrency } from '@/lib/concurrency'
import { envNumber } from '@/lib/env'

export const SALT_ROUNDS = 12

// bcryptjs computes on the main thread of Node: forty checks at once freeze the whole application (health probes
// included) for seconds. Two at a time give the same throughput without the freeze; the others wait, and past
// BCRYPT_QUEUE waiting a check is refused with a BusyError (#225).
const slots = limitConcurrency(envNumber('BCRYPT_CONCURRENCY', 2), envNumber('BCRYPT_QUEUE', 150))

export async function hashPassword(plain: string): Promise<string> {
  return slots(() => bcrypt.hash(plain, SALT_ROUNDS))
}

/**
 * A valid hash (12 rounds, of a random secret nobody has) checked when the address has no account, so that
 * answering "wrong email or password" takes as long as for a wrong password on a real account: the time
 * of the answer does not tell which addresses have an account (#225).
 */
export const UNKNOWN_ACCOUNT_HASH = '$2b$12$h23tUPs/mlkKgnpIFMAEK.gS8LC.lGAZ2YYblCg.4g8BzYRSnXuoy'

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return slots(() => bcrypt.compare(plain, hash))
}
