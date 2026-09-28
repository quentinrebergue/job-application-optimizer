# Solution Approach: 1D DP (Rolling Pair)

## Pattern Recognition
→ **Dynamic Programming** — at each house, you either skip it (best so far unchanged) or rob it (this house's value plus the best total from two houses back, since the adjacent one is off-limits).

## Steps

1. Initialize `prev2 = 0` (best up to two houses ago), `prev1 = 0` (best up to the previous house).
2. For each `num` in `nums`:
   - `curr = max(prev1, prev2 + num)`.
   - `prev2, prev1 = prev1, curr`.
3. Return `prev1`.

## Why This Works
`curr` only ever needs the best totals from the previous two houses, so a full DP array isn't necessary — two rolling variables capture the whole recurrence `dp[i] = max(dp[i-1], dp[i-2] + nums[i])`.

## Complexity
- Time: O(n)
- Space: O(1)
