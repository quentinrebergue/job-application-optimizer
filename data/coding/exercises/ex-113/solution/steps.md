# Solution Approach: Use the First Row/Column as Markers

## Pattern Recognition
→ **Matrix Traversal** — instead of a separate visited/marker structure, reuse the matrix's own first row and first column as the "which rows/columns need zeroing" record, then apply the zeroing in a second pass.

## Steps

1. Before touching anything, record whether the first row and first column each already contain a zero (`first_row_has_zero`, `first_col_has_zero`) — since we're about to reuse them as markers.
2. Scan the rest of the matrix (`r, c` from 1): if `matrix[r][c] == 0`, mark `matrix[r][0] = 0` and `matrix[0][c] = 0`.
3. Scan again (`r, c` from 1): if `matrix[r][0] == 0` or `matrix[0][c] == 0`, set `matrix[r][c] = 0`.
4. Finally, zero out the first row entirely if `first_row_has_zero`, and the first column entirely if `first_col_has_zero`.

## Why This Works
The first row/column can only encode "this row/column needs zeroing" for the *other* rows/columns; they can't encode their own status without corrupting the traversal, which is exactly why their original zero-state is saved before being overwritten as markers, and applied last.

## Complexity
- Time: O(m × n)
- Space: O(1) extra
