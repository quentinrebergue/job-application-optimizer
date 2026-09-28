# Solution Approach: Run House Robber Twice, Excluding One End

## Pattern Recognition
→ **Dynamic Programming** — the circle constraint just means house 0 and house n-1 can't both be robbed. Split into two linear subproblems — "exclude the last house" and "exclude the first house" — and solve each with the plain House Robber recurrence.

## Steps

1. If there's only one house, return its value directly (no adjacency conflict to worry about).
2. Run the linear House Robber DP on `nums[:-1]` (excludes the last house).
3. Run the linear House Robber DP on `nums[1:]` (excludes the first house).
4. Return the larger of the two results.

## Why This Works
Any valid robbery plan either skips house 0 or skips house n-1 (it can never keep both, since they're adjacent in the circle). Taking the best of "assume house n-1 is skipped" and "assume house 0 is skipped" covers every valid plan exactly once.

## Complexity
- Time: O(n) — two linear passes
- Space: O(1)
