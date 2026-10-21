import { describe, it, expect } from 'vitest'
import type { AIAnalysisResult } from '@/types/job'
import { compare, overall, scoreRun, stability, summarize, type Library, type RunRecord } from './metrics'

const LIBRARY: Library = {
  experiences: [{ id: 'e1' }, { id: 'e2' }, { id: 'e3' }],
  projects: [{ id: 'p1' }],
  skills: [{ id: 's1' }],
  education: [{ id: 'd1' }],
}

function analysis(partial: { experiences?: string[]; projects?: string[]; skills?: string[]; scored?: string[] }): AIAnalysisResult {
  return {
    recommended_experience_ids: partial.experiences ?? [],
    recommended_project_ids: partial.projects ?? [],
    recommended_skill_ids: partial.skills ?? [],
    entities_by_type: {
      experiences: (partial.scored ?? []).map((id) => ({ id })),
      projects: [], skills: [], education: [],
    },
  } as unknown as AIAnalysisResult
}

describe('scoreRun', () => {
  const expected = { experiences: ['e1', 'e2'], projects: ['p1'], skills: [] }

  it('computes recall and precision over the selected types', () => {
    const m = scoreRun(expected, LIBRARY, analysis({ experiences: ['e1', 'e3'], projects: ['p1'] }))
    expect(m).toMatchObject({ hits: 2, expected: 3, recommended: 3 })
    expect(m.recall).toBeCloseTo(2 / 3)
    expect(m.precision).toBeCloseTo(2 / 3)
  })

  it('separates an expected entry the AI forgot from one it judged low', () => {
    // e1 was rated but not recommended; e2 was never mentioned.
    const m = scoreRun(expected, LIBRARY, analysis({ experiences: [], scored: ['e1'] }))
    expect(m.expectedNotScored).toBe(2) // e2 and p1 (no scores for projects)
    expect(m.recall).toBe(0)
  })

  it('counts invented ids', () => {
    const m = scoreRun(expected, LIBRARY, analysis({ experiences: ['e1', 'zzz'] }))
    expect(m.invalidIds).toBe(1)
    expect(m.invalid).toEqual(['experiences:zzz'])
  })

  it('lists what was missed and what was added', () => {
    const m = scoreRun(expected, LIBRARY, analysis({ experiences: ['e1', 'e3'], projects: ['p1'] }))
    expect(m.missed).toEqual(['experiences:e2'])
    expect(m.extra).toEqual(['experiences:e3'])
  })

  it('has no recall when nothing is expected and no precision when nothing is picked', () => {
    const m = scoreRun({ experiences: [], projects: [], skills: [] }, LIBRARY, analysis({}))
    expect(m.recall).toBeNull()
    expect(m.precision).toBeNull()
  })
})

describe('stability', () => {
  it('is 1 for identical selections and lower when they differ', () => {
    expect(stability([['a', 'b'], ['a', 'b']])).toBe(1)
    expect(stability([['a', 'b'], ['a', 'c']])).toBeCloseTo(1 / 3)
  })
  it('needs at least two runs', () => {
    expect(stability([['a']])).toBeNull()
  })
})

describe('summarize and compare', () => {
  const run = (recall: number, ms: number): RunRecord => ({
    ok: true,
    metrics: { hits: 0, expected: 0, recommended: 0, recall, precision: recall, invalidIds: 0, emptyTypes: 0, leaks: 0, droppedProposals: 0, expectedNotScored: 0, selection: ['a'], missed: [], extra: [], invalid: [] },
    ms, promptTokens: 1000, completionTokens: 500,
  })

  it('keeps failures apart from the averages', () => {
    const s = summarize([run(1, 10_000), { ok: false, error: 'timeout' }, run(0.5, 30_000)])
    expect(s).toMatchObject({ runs: 3, failures: 1, msMedian: 20_000, msMax: 30_000 })
    expect(s.recall).toBeCloseTo(0.75)
  })

  it('flags a regression and an improvement, ignores noise', () => {
    const before = overall([summarize([run(0.6, 30_000)])])
    const after = overall([summarize([run(0.9, 31_000)])])
    const verdicts = Object.fromEntries(compare(before, after).map((c) => [c.metric, c.verdict]))
    expect(verdicts.recall).toBe('better')
    expect(verdicts.msMedian).toBe('same') // +3 %
    const worse = overall([summarize([run(0.3, 60_000)])])
    const v2 = Object.fromEntries(compare(before, worse).map((c) => [c.metric, c.verdict]))
    expect(v2.recall).toBe('worse')
    expect(v2.msMedian).toBe('worse')
  })

  it('counts the types the code had to complete (#218), and compares with a reference saved before the figure existed', () => {
    const base = run(1, 1000) as Extract<RunRecord, { ok: true }>
    const empty: RunRecord = { ...base, metrics: { ...base.metrics, emptyTypes: 2 } }
    expect(summarize([empty, run(1, 1000)]).emptyTypes).toBe(1)
    const after = overall([summarize([empty])])
    const old = { ...overall([summarize([run(1, 1000)])]), emptyTypes: undefined as unknown as number }
    expect(compare(old, after).find((c) => c.metric === 'emptyTypes')?.verdict).toBe('same')
    expect(compare(overall([summarize([run(1, 1000)])]), after).find((c) => c.metric === 'emptyTypes')?.verdict).toBe('worse')
  })
})
