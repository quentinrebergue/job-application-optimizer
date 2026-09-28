# Solution Approach: Multi-Source DFS from Each Ocean

## Pattern Recognition
→ **Matrix Traversal** — instead of asking "can this cell reach an ocean?" (which means a DFS per cell, O((mn)²)), flip the question: start a DFS **from every border cell of each ocean** and mark every cell reachable by flowing *uphill or level* from there. A cell that's reachable from both searches is the answer.

## Steps

1. Allocate two boolean grids `pacific` and `atlantic`, same shape as `heights`.
2. Define `dfs(r, c, visited)`: mark `visited[r][c] = True`; for each of the 4 neighbors `(nr, nc)`, if in bounds, not yet visited, and `heights[nr][nc] >= heights[r][c]`, recurse into it.
3. Run `dfs` from every cell on the top row and left column into `pacific`.
4. Run `dfs` from every cell on the bottom row and right column into `atlantic`.
5. Collect every `(r, c)` where both `pacific[r][c]` and `atlantic[r][c]` are true.

## Why This Works
Water flowing downhill from a cell to the ocean is the same reachability relation as flowing *uphill* from the ocean border back to that cell. Doing one multi-source DFS per ocean (rather than one DFS per cell) visits each cell at most twice total, instead of re-exploring the whole grid from every starting point.

## Complexity
- Time: O(m × n) — each ocean's DFS visits every cell at most once
- Space: O(m × n) for the visited grids and recursion stack
