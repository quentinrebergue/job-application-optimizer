/** Thrown when too many jobs wait already: the caller says "busy, try again" instead of piling up more. */
export class BusyError extends Error {
  constructor() {
    super('Too many requests at once')
    this.name = 'BusyError'
  }
}

/**
 * Lets at most `maxActive` jobs run at the same time; the others wait their turn, in order, up to `maxQueued`
 * waiting. Past that, a new job is refused with a BusyError.
 *
 * Made for the hashing of passwords (#225): bcryptjs runs on the main thread of Node (a quarter of a second
 * a check), so forty checks at once freeze the whole application, health probes included, for seconds, while
 * two at a time give the same throughput and a freeze of a fraction of a second.
 */
export function limitConcurrency(maxActive: number, maxQueued: number) {
  let active = 0
  const waiting: Array<() => void> = []

  return async function run<T>(job: () => Promise<T>): Promise<T> {
    if (active >= maxActive) {
      if (waiting.length >= maxQueued) throw new BusyError()
      // The slot is handed over by the job that ends: `active` stays as it is.
      await new Promise<void>((resolve) => waiting.push(resolve))
    } else {
      active++
    }
    try {
      return await job()
    } finally {
      const next = waiting.shift()
      if (next) next()
      else active--
    }
  }
}
