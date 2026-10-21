import { describe, it, expect } from 'vitest'
import { runPool, tooManyFailures } from './parallel'

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

describe('tooManyFailures', () => {
  it('waits for enough calls to say, then stops above half', () => {
    expect(tooManyFailures(5, 5)).toBe(false)
    expect(tooManyFailures(6, 3)).toBe(false)
    expect(tooManyFailures(6, 4)).toBe(true)
    expect(tooManyFailures(40, 20)).toBe(false)
    expect(tooManyFailures(40, 21)).toBe(true)
  })
})

describe('runPool', () => {
  it('runs every job, keeps the order of the results, and never more than `parallel` at once', async () => {
    let active = 0
    let peak = 0
    const jobs = Array.from({ length: 10 }, (_, i) => async () => {
      active++
      peak = Math.max(peak, active)
      await pause(5 + (i % 3) * 3)
      active--
      return i
    })
    const { results, stopped } = await runPool(jobs, 3, () => false)
    expect(results).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
    expect(peak).toBe(3)
    expect(stopped).toBe(false)
  })

  it('runs one at a time by default of 1, in order', async () => {
    const order: number[] = []
    const jobs = [0, 1, 2].map((i) => async () => { await pause(3 - i); order.push(i); return i })
    await runPool(jobs, 1, () => false)
    expect(order).toEqual([0, 1, 2])
  })

  it('reports the progress of each finished job', async () => {
    const seen: [number, number][] = []
    await runPool([async () => 1, async () => 2], 2, () => false, (done, total) => seen.push([done, total]))
    expect(seen).toEqual([[1, 2], [2, 2]])
  })

  it('stops sending jobs when most calls fail, and leaves the rest not run', async () => {
    const jobs = Array.from({ length: 30 }, (_, i) => async () => { await pause(1); return i })
    const { results, stopped } = await runPool(jobs, 2, () => true)
    expect(stopped).toBe(true)
    expect(results.filter((r) => r !== undefined).length).toBeLessThan(30)
    expect(results[29]).toBeUndefined()
  })

  it('copes with more workers than jobs, and with no job', async () => {
    expect((await runPool([async () => 'a'], 8, () => false)).results).toEqual(['a'])
    expect(await runPool([], 4, () => false)).toEqual({ results: [], stopped: false })
  })
})
