import { describe, it, expect } from 'vitest'
import { BusyError, limitConcurrency } from './concurrency'

/** A job that ends when the test says so, and notes how many run at once. */
function controlled() {
  const state = { running: 0, peak: 0, started: [] as number[] }
  const job = (id: number) => {
    let end!: (value: number) => void
    const done = new Promise<number>((resolve) => (end = resolve))
    const run = async () => {
      state.running++
      state.peak = Math.max(state.peak, state.running)
      state.started.push(id)
      try {
        return await done
      } finally {
        state.running--
      }
    }
    return { run, end: () => end(id) }
  }
  return { state, job }
}

const tick = () => new Promise((resolve) => setImmediate(resolve))

describe('limitConcurrency (#225)', () => {
  it('never runs more jobs than the limit at once, and runs them all', async () => {
    const run = limitConcurrency(2, 100)
    const { state, job } = controlled()
    const jobs = Array.from({ length: 10 }, (_, i) => job(i))
    const results = jobs.map((j) => run(j.run))
    await tick()
    expect(state.running).toBe(2)
    for (const j of jobs) {
      j.end()
      await tick()
    }
    expect(await Promise.all(results)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
    expect(state.peak).toBe(2)
  })

  it('starts the waiting jobs in the order they came', async () => {
    const run = limitConcurrency(1, 100)
    const { state, job } = controlled()
    const jobs = [job(0), job(1), job(2), job(3)]
    const results = jobs.map((j) => run(j.run))
    for (const j of jobs) {
      await tick()
      j.end()
    }
    await Promise.all(results)
    expect(state.started).toEqual([0, 1, 2, 3])
  })

  it('refuses a job with a BusyError once the queue is full, and keeps the ones that wait', async () => {
    const run = limitConcurrency(1, 2)
    const { job } = controlled()
    const jobs = [job(0), job(1), job(2), job(3)]
    const results = jobs.map((j) => run(j.run))
    await expect(results[3]).rejects.toBeInstanceOf(BusyError)
    for (const j of jobs.slice(0, 3)) {
      await tick()
      j.end()
    }
    expect(await Promise.all(results.slice(0, 3))).toEqual([0, 1, 2])
  })

  it('frees the slot when a job fails, so the next one is not stuck', async () => {
    const run = limitConcurrency(1, 10)
    const failing = run(async () => {
      throw new Error('boom')
    })
    const next = run(async () => 'ok')
    await expect(failing).rejects.toThrow('boom')
    expect(await next).toBe('ok')
  })

  it('accepts new jobs again once the queue has drained', async () => {
    const run = limitConcurrency(1, 0)
    expect(await run(async () => 1)).toBe(1)
    expect(await run(async () => 2)).toBe(2)
    const { job } = controlled()
    const slow = job(0)
    const first = run(slow.run)
    await expect(run(async () => 3)).rejects.toBeInstanceOf(BusyError)
    slow.end()
    await first
    expect(await run(async () => 4)).toBe(4)
  })
})
