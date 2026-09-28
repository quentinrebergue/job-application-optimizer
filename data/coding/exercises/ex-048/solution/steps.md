# Solution Approach: Greedy Interval Scheduling

## Pattern Recognition
→ **Greedy** — equivalent to "maximum number of non-overlapping intervals" (Activity Selection). The answer = n - maxNonOverlapping.

## Key Insight
Sort by **end time**. Greedily keep every interval that doesn't overlap with the last kept one. This maximizes the number of kept intervals, thus minimizing removals.

**Why end time?** An interval ending earlier leaves more room for subsequent intervals — it's provably optimal (exchange argument).

## Steps

1. Sort `intervals` by end time.
2. `kept = 1`, `lastEnd = intervals[0][1]`.
3. For `i` from 1 to n-1:
   - If `intervals[i][0] >= lastEnd` (no overlap):
     - `kept++`, `lastEnd = intervals[i][1]`.
4. Return `n - kept`.

## Why Not Sort by Start Time?
Sorting by start could pick a long interval early that blocks many later short ones. End-time sorting is the classic optimal greedy choice.

## Complexity
- Time: O(n log n) — sorting
- Space: O(1)
