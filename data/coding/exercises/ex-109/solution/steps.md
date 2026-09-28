# Solution Approach: Sort by Start Time, Check Adjacent Pairs

## Pattern Recognition
→ **Intervals** — once sorted by start time, any overlap must occur between two intervals that end up adjacent in that order. A single linear scan comparing each interval to the previous one is enough.

## Steps

1. Sort `intervals` by start time.
2. For each pair of adjacent intervals `(prev, curr)`:
   - If `curr[0] < prev[1]`, they overlap — return `False`.
3. If no adjacent pair overlaps, return `True`.

## Why This Works
Sorting by start time guarantees that if any two intervals overlap, at least one of the intervals directly between them in sorted order also overlaps with its immediate neighbor — so checking only adjacent pairs after sorting is sufficient; no need to compare every pair.

## Complexity
- Time: O(n log n) — dominated by the sort
- Space: O(1) extra (O(n) or O(log n) for the sort itself, depending on implementation)
