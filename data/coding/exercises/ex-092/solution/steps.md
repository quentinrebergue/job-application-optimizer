# Solution Approach: Kadane's Algorithm (1D DP)

## Pattern Recognition
→ **Dynamic Programming** — let `curr` be the best sum of a subarray ending exactly at the current index. At each step, either extend the previous subarray or start fresh here, whichever is larger.

## Steps

1. Initialize `curr = nums[0]`, `best = nums[0]`.
2. For each `num` in `nums[1:]`:
   - `curr = max(num, curr + num)` — extend or restart.
   - `best = max(best, curr)`.
3. Return `best`.

## Why This Works
`curr` only depends on the immediately preceding sub-solution (`curr` from the previous index), which is the hallmark of a 1D DP recurrence — we never need to re-examine earlier elements once they're folded into `curr`.

## Complexity
- Time: O(n)
- Space: O(1)
