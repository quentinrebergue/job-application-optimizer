# Solution Approach: Sort + Linear Scan

## Pattern Recognition
→ **Sorting** — once sorted by start time, overlapping intervals are always adjacent.

## Steps

1. Sort `intervals` by start value.
2. Initialize `result` with the first interval.
3. For each subsequent interval `[start, end]`:
   - If `start ≤ result[-1][1]` (overlaps with last merged interval), extend the end: `result[-1][1] = max(result[-1][1], end)`.
   - Otherwise, push `[start, end]` as a new entry in `result`.
4. Return `result`.

## Why This Works
After sorting, if interval `i` doesn't overlap with `i-1`, it can never overlap with any earlier interval (starts are non-decreasing). So a single left-to-right pass suffices.

## Complexity
- Time: O(n log n) dominated by sort
- Space: O(n) for output