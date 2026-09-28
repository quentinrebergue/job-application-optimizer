# Number of Islands

Given an `m × n` 2D binary grid where `'1'` represents land and `'0'` represents water, return the number of islands.

An island is surrounded by water and is formed by connecting adjacent lands horizontally or vertically.

**Example 1:**
```
Input:
grid = [
  ["1","1","1","1","0"],
  ["1","1","0","1","0"],
  ["1","1","0","0","0"],
  ["0","0","0","0","0"]
]
Output: 1
```

**Example 2:**
```
Input:
grid = [
  ["1","1","0","0","0"],
  ["1","1","0","0","0"],
  ["0","0","1","0","0"],
  ["0","0","0","1","1"]
]
Output: 3
```

**Constraints:**
- m == grid.length, n == grid[i].length
- 1 ≤ m, n ≤ 300
- grid[i][j] is `'0'` or `'1'`