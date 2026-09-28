# Solution Approach: Greedy (Track Max Reach)

## Pattern Recognition
→ **Greedy** — at each step, maintain the furthest index reachable. If we ever stand on an index beyond our current max reach, it's impossible.

## Steps

1. `maxReach = 0`.
2. For each index `i` from 0 to n-1:
   - If `i > maxReach`: return `false` (we can't reach index i).
   - `maxReach = max(maxReach, i + nums[i])`.
3. Return `true`.

## Why This Works
`maxReach` is the greedy "frontier" — the best we can do from any index we've reached so far. If `i > maxReach` at any point, we've hit a dead end regardless of what path we took. Otherwise, we can always reach or exceed `i + nums[i]` by choosing the optimal jump.

## Complexity
- Time: O(n)
- Space: O(1)
