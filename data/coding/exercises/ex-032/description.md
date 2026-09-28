# Minimum Path Sum

Given an `m × n` grid filled with non-negative numbers, find a path from top-left to bottom-right that **minimizes the sum** of all numbers along the path.

You can only move **right or down** at any point.

**Example 1:**
```
Input:
grid = [[1,3,1],
         [1,5,1],
         [4,2,1]]
Output: 7
Explanation: Path 1→3→1→1→1 = 7
```

**Example 2:**
```
Input:  grid = [[1,2,3],[4,5,6]]
Output: 12
```

**Constraints:**
- `m == grid.length`, `n == grid[i].length`
- `1 <= m, n <= 200`
- `0 <= grid[i][j] <= 200`
