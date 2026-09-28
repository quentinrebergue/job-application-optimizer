# Solution Approach: DFS with In-Place Marking

## Pattern Recognition
→ **DFS on a grid** — visit all connected land cells and mark them to avoid recounting.

## Steps

1. Iterate over every cell `(r, c)` in the grid.
2. When you find a `'1'`:
   - Increment the island counter.
   - Call `dfs(r, c)` to sink the entire island (mark all connected `'1'`s as `'0'`).
3. `dfs(r, c)`:
   - If out of bounds or `grid[r][c] != '1'`, return.
   - Set `grid[r][c] = '0'` (mark visited).
   - Recurse on all 4 neighbors: up, down, left, right.
4. Return the counter.

## Why This Works
Each DFS call floods one entire island. By converting `'1'` to `'0'` in place, we avoid a separate `visited` set. After the DFS, all land of that island is "sunk" and won't be counted again.

## Alternative: BFS
Same approach but use a queue instead of recursion — avoids stack overflow on very large grids.

## Complexity
- Time: O(m × n) — each cell is visited at most once
- Space: O(m × n) for the recursion stack in the worst case (one big snake-shaped island)