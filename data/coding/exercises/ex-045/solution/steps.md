# Solution Approach: Greedy BFS (Level-by-Level)

## Pattern Recognition
→ **Greedy BFS** — think of each jump count as a "level". Greedily exhaust all positions reachable in the current level before incrementing the jump counter.

## Steps

1. `jumps = 0`, `currentEnd = 0`, `farthest = 0`.
2. For `i` from 0 to n-2 (don't need to jump from last index):
   - `farthest = max(farthest, i + nums[i])`.
   - If `i === currentEnd` (end of current level reached):
     - `jumps++`.
     - `currentEnd = farthest`.
     - If `currentEnd >= n - 1`: break early.
3. Return `jumps`.

## Mental Model
Each "level" is the set of all positions reachable with exactly `jumps` jumps. When we exhaust the current level (i reaches `currentEnd`), we must take one more jump — and `farthest` becomes the boundary of the next level.

## Relation to Jump Game I (ex-044)
Jump Game I just checks if `maxReach` ever covers the last index. Jump Game II counts how many times we need to "advance the frontier".

## Complexity
- Time: O(n)
- Space: O(1)
