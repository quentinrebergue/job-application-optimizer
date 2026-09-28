# Solution Approach: 2D Grid DP (1D Rolling Row)

## Pattern Recognition
→ **Dynamic Programming** — the number of ways to reach any cell is the sum of the ways to reach the cell above it and the cell to its left, since those are the only two moves that lead into it.

## Steps

1. Initialize a 1D array `row = [1] * n` (the top row: only one way to reach any cell in it — move right repeatedly).
2. For each of the remaining `m - 1` rows:
   - For `c` from 1 to `n - 1`: `row[c] += row[c - 1]` — add the "came from above" count (still in `row[c]` from the previous iteration) to the "came from the left" count.
3. Return `row[n - 1]`.

## Why This Works
`row[c]` starts each outer iteration holding "ways to reach this cell from above," and adding `row[c-1]` (already updated to reflect this new row) folds in "ways to reach it from the left." This reuses a single array instead of a full 2D table, since each row of the DP grid only ever depends on the row directly above it.

## Complexity
- Time: O(m × n)
- Space: O(n)
