# Pacific Atlantic Water Flow

There is an `m × n` rectangular island bordering both the Pacific Ocean (top and left edges) and the Atlantic Ocean (bottom and right edges). `heights[r][c]` is the height of the cell at `(r, c)`.

Water can flow from a cell to an adjacent cell with height less than or equal to it, in the four cardinal directions. Water can flow from any cell adjacent to an ocean into that ocean.

Return a list of grid coordinates where water can flow to **both** the Pacific and Atlantic oceans.

**Example:**
```
Input:
heights = [
  [1,2,2,3,5],
  [3,2,3,4,4],
  [2,4,5,3,1],
  [6,7,1,4,5],
  [5,1,1,2,4]
]
Output: [[0,4],[1,3],[1,4],[2,2],[3,0],[3,1],[4,0]]
```

**Constraints:**
- m == heights.length, n == heights[r].length
- 1 ≤ m, n ≤ 200
- 0 ≤ heights[r][c] ≤ 10⁵
