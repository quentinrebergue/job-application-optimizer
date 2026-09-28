# Solution Approach: Track Running Max AND Min (DP)

## Pattern Recognition
→ **Dynamic Programming** — like Maximum Subarray, but a negative number can turn the smallest (most negative) running product into the new largest one. Track both a running max and a running min ending at each index.

## Steps

1. Initialize `curr_max = curr_min = best = nums[0]`.
2. For each `num` in `nums[1:]`:
   - If `num < 0`, swap `curr_max` and `curr_min` (multiplying by a negative flips which one is bigger).
   - `curr_max = max(num, curr_max * num)`.
   - `curr_min = min(num, curr_min * num)`.
   - `best = max(best, curr_max)`.
3. Return `best`.

## Why This Works
Multiplication isn't monotonic like addition — a very negative running product can become the new maximum after multiplying by another negative number. Tracking the running minimum alongside the maximum ensures we never lose that possibility.

## Complexity
- Time: O(n)
- Space: O(1)
