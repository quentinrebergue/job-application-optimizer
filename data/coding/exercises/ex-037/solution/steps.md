# Solution Approach: DP / Sliding Window

## Pattern Recognition
→ **Incremental DP** — `dp[i]` = number of arithmetic slices ending at index `i`. Each time we extend an arithmetic run, we gain `dp[i-1] + 1` new slices.

## Key Insight
If `nums[i] - nums[i-1] === nums[i-1] - nums[i-2]`, then every arithmetic slice ending at `i-1` can be extended by one element, plus the new slice `[i-2, i-1, i]`.

So: `dp[i] = dp[i-1] + 1`.

## Steps

1. `dp = 0` (slices ending at current position), `total = 0`.
2. For `i` from 2 to n-1:
   - If `nums[i] - nums[i-1] === nums[i-1] - nums[i-2]`:
     - `dp++` (one more than previous).
     - `total += dp`.
   - Else: `dp = 0`.
3. Return `total`.

## Worked Example
`nums = [1,2,3,4]`
- i=2: diff 1==1 → dp=1, total=1 (slice [1,2,3])
- i=3: diff 1==1 → dp=2, total=3 (slices [2,3,4] and [1,2,3,4])

## Complexity
- Time: O(n)
- Space: O(1)
