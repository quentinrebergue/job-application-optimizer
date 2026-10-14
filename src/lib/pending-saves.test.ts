import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { PendingSaves } from './pending-saves'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('PendingSaves', () => {
  it('saves a field after its delay', () => {
    const run = vi.fn()
    const pending = new PendingSaves<'title' | 'period'>()
    pending.schedule('title', 'A', 800, run)
    expect(pending.waiting).toBe(true)
    vi.advanceTimersByTime(799)
    expect(run).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(run).toHaveBeenCalledWith('title', 'A')
    expect(pending.waiting).toBe(false)
  })

  it('keeps only the last value typed in a field, and one save per field', () => {
    const run = vi.fn()
    const pending = new PendingSaves<'title' | 'period'>()
    pending.schedule('title', 'A', 800, run)
    vi.advanceTimersByTime(500)
    pending.schedule('title', 'AB', 800, run)
    pending.schedule('period', '2020', 800, run)
    vi.advanceTimersByTime(800)
    expect(run.mock.calls).toEqual([['title', 'AB'], ['period', '2020']])
  })

  it('flushes what is waiting at once when someone leaves, and nothing is saved twice', () => {
    const run = vi.fn()
    const pending = new PendingSaves<'title' | 'period'>()
    pending.schedule('title', 'Typed a moment ago', 800, run)
    pending.schedule('period', '2021', 800, run)
    vi.advanceTimersByTime(100)
    pending.flush(run)
    expect(run.mock.calls).toEqual([['title', 'Typed a moment ago'], ['period', '2021']])
    expect(pending.waiting).toBe(false)
    vi.advanceTimersByTime(5000)
    expect(run).toHaveBeenCalledTimes(2)
  })

  it('flushes nothing when nothing is waiting, and drops a cancelled save', () => {
    const run = vi.fn()
    const pending = new PendingSaves<'title'>()
    pending.flush(run)
    pending.schedule('title', 'x', 800, run)
    pending.cancel('title')
    pending.flush(run)
    vi.advanceTimersByTime(5000)
    expect(run).not.toHaveBeenCalled()
  })
})
