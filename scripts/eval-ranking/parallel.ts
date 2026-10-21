/**
 * Runs the calls of an evaluation a few at a time (`--parallel`). The provider limits how many calls it takes at once:
 * when most of the first calls fail, the rest are not sent, since each would fail too and cost a wait.
 */

/** Too many of the calls finished so far failed: more than half, once there are enough of them to say. */
export function tooManyFailures(done: number, failed: number): boolean {
  return done >= 6 && failed * 2 > done
}

export interface PoolResult<T> {
  /** One per job, in the order of the jobs; undefined for a job that was not run. */
  results: (T | undefined)[]
  /** The pool stopped sending jobs because too many failed. */
  stopped: boolean
}

export async function runPool<T>(
  jobs: (() => Promise<T>)[],
  parallel: number,
  isFailure: (result: T) => boolean,
  onProgress?: (done: number, total: number) => void,
): Promise<PoolResult<T>> {
  const results: (T | undefined)[] = new Array(jobs.length).fill(undefined)
  let next = 0
  let done = 0
  let failed = 0
  let stopped = false

  async function worker() {
    while (!stopped && next < jobs.length) {
      const index = next++
      const result = await jobs[index]()
      results[index] = result
      done++
      if (isFailure(result)) failed++
      if (tooManyFailures(done, failed)) stopped = true
      onProgress?.(done, jobs.length)
    }
  }

  await Promise.all(Array.from({ length: Math.min(Math.max(1, parallel), jobs.length) }, worker))
  return { results, stopped }
}
