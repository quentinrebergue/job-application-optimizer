/** Is a difference between two evaluations real, or could it be chance? Paired by case: each offer is compared with itself. */

export interface Paired {
  n: number
  better: number
  worse: number
  same: number
  /** Mean difference (after minus before), in the unit of the values. */
  mean: number
  /** 95 % interval of the mean difference. */
  low: number
  high: number
}

// Two-sided 95 % Student values for 1 to 30 degrees of freedom.
const T95 = [12.706, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262, 2.228, 2.201, 2.179, 2.16, 2.145, 2.131, 2.12, 2.11, 2.101, 2.093, 2.086, 2.08, 2.074, 2.069, 2.064, 2.06, 2.056, 2.052, 2.048, 2.045, 2.042]

/** The values of the same cases before and after, in the same order. */
export function paired(before: number[], after: number[], tolerance = 0.005): Paired | null {
  const n = Math.min(before.length, after.length)
  if (n < 2) return null
  const diffs = Array.from({ length: n }, (_, i) => after[i] - before[i])
  const mean = diffs.reduce((a, b) => a + b, 0) / n
  const variance = diffs.reduce((sum, d) => sum + (d - mean) ** 2, 0) / (n - 1)
  const margin = (T95[n - 2] ?? 1.96) * Math.sqrt(variance / n)
  return {
    n,
    better: diffs.filter((d) => d > tolerance).length,
    worse: diffs.filter((d) => d < -tolerance).length,
    same: diffs.filter((d) => Math.abs(d) <= tolerance).length,
    mean,
    low: mean - margin,
    high: mean + margin,
  }
}

const points = (x: number) => `${x >= 0 ? '+' : ''}${(x * 100).toFixed(0)}`

/** One sentence: what changed, case by case, and whether it could be chance. */
export function describePaired(p: Paired | null): string {
  if (!p) return 'too few cases to say'
  const cases = `better on ${p.better} case(s), worse on ${p.worse}, same on ${p.same}`
  const interval = `mean ${points(p.mean)} points, 95% interval ${points(p.low)} to ${points(p.high)}`
  const verdict = p.low > 0 ? 'probably real' : p.high < 0 ? 'probably a real drop' : 'could be chance'
  return `${cases}; ${interval}: ${verdict}`
}
