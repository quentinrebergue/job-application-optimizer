/** What an import should give for a resume, and whether a run gave it. No AI, no file: tested alone. */

export const KINDS = ['experiences', 'projects', 'education', 'skills'] as const
export type Kind = (typeof KINDS)[number]

/** A number (exactly that many) or a range. A kind left out is not checked. */
export type Expect = number | { min?: number; max?: number }
export type Expected = Partial<Record<Kind, Expect>>
export type Counts = Record<Kind, number>

const describe = (expect: Expect): string => {
  if (typeof expect === 'number') return String(expect)
  const { min, max } = expect
  if (min !== undefined && max !== undefined) return `${min} to ${max}`
  return min !== undefined ? `${min} or more` : `${max} or fewer`
}

const holds = (expect: Expect, count: number): boolean => {
  if (typeof expect === 'number') return count === expect
  return (expect.min === undefined || count >= expect.min) && (expect.max === undefined || count <= expect.max)
}

/** What is wrong with a run, one sentence per kind; empty when it is what was expected. */
export function problems(expected: Expected, counts: Counts): string[] {
  return KINDS.flatMap((kind) => {
    const expect = expected[kind]
    return expect === undefined || holds(expect, counts[kind]) ? [] : [`${kind}: ${counts[kind]} (expected ${describe(expect)})`]
  })
}
