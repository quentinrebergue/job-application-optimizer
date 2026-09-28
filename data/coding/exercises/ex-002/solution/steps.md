# Solution Approach: Fixed-Size Sliding Window

## Pattern Recognition
→ **Sliding Window (fixed size k)** — we need the max sum over all windows of size k.

## Steps

1. Compute the sum of the first `k` elements → initial `windowSum`.
2. Set `maxSum = windowSum`.
3. Slide the window from index `k` to end:
   - Add `nums[i]` (incoming right element).
   - Subtract `nums[i - k]` (outgoing left element).
   - Update `maxSum = max(maxSum, windowSum)`.
4. Return `maxSum / k`.

## Why This Works
Instead of recomputing the sum for each window (O(k) each), we maintain a running sum and update it in O(1) per step → O(n) total.

## Complexity
- Time: O(n)
- Space: O(1)
