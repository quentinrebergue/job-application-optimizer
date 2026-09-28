# Solution Approach: In-Place 2D DP

## Pattern Recognition
→ **2D Grid DP** — dp[i][j] = minimum cost to reach cell (i,j). Since we can only go right or down, each cell depends only on the cell above and the cell to the left.

## Steps

1. Modify `grid` in-place (or use a copy).
2. First row: `grid[0][j] += grid[0][j-1]` for j > 0 (can only come from the left).
3. First column: `grid[i][0] += grid[i-1][0]` for i > 0 (can only come from above).
4. For remaining cells: `grid[i][j] += Math.min(grid[i-1][j], grid[i][j-1])`.
5. Return `grid[m-1][n-1]`.

## Why In-Place?
`grid[i][j]` depends on `grid[i-1][j]` (above, already updated) and `grid[i][j-1]` (left, already updated). The in-place modification respects this dependency order.

## Complexity
- Time: O(m × n)
- Space: O(1) if modifying in-place, O(m × n) if using a copy
