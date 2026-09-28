# Solution Approach: Two Heaps (Max-Heap + Min-Heap)

## Pattern Recognition
→ **Top K / Heap** — split the stream into a "lower half" (max-heap, so its largest is instantly available) and an "upper half" (min-heap, so its smallest is instantly available). The median sits right at the boundary between them.

## Steps

1. Maintain `small` (a max-heap of the lower half — Python's `heapq` is min-heap only, so store negated values) and `large` (a min-heap of the upper half).
2. `add_num(num)`: push onto `small` first, then move `small`'s max over to `large` (keeps every element in `large` ≥ every element in `small`). If `large` grew larger than `small`, move its min back to `small` — this keeps the two heaps balanced in size (differing by at most 1).
3. `find_median()`: if `small` has one more element than `large`, the median is `small`'s top. Otherwise, both heaps are equal size — the median is the average of both tops.

## Why This Works
Keeping every value in `small` ≤ every value in `large`, with sizes differing by at most one, means the median is always sitting right at the two heaps' tops — no need to re-sort or scan the whole stream on every query.

## Complexity
- Time: O(log n) per `addNum`, O(1) per `findMedian`
- Space: O(n)
