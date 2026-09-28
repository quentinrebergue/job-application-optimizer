# Solution Approach: Backtracking DFS from Every Cell

## Pattern Recognition
→ **Backtracking** — try to match the word starting at each cell, exploring one letter at a time. If a path turns out wrong, undo the last cell (un-mark it) and try a different direction — the classic try/undo shape of backtracking, here overlaid on a grid instead of an abstract list of choices.

## Steps

1. For every starting cell `(r, c)`, attempt `dfs(r, c, 0)` (matching `word[0]` onward).
2. `dfs(r, c, i)`:
   - If `i == len(word)`, the whole word matched — return `True`.
   - If out of bounds, or `board[r][c] != word[i]`, or the cell is already used on this path — return `False`.
   - Temporarily mark `board[r][c]` as visited (e.g. overwrite with a sentinel character).
   - Recurse into all 4 neighbors with `i + 1`; if any succeeds, return `True`.
   - Restore `board[r][c]` before returning (undo the choice) so other paths can reuse this cell.
3. Return `True` as soon as any starting cell succeeds; otherwise `False`.

## Why This Works
Marking a cell "in use" during the current path prevents reusing it within that same attempt, and restoring it afterward (backtracking) makes it available again for different starting points or different paths that don't go through it — without needing a separate visited array.

## Complexity
- Time: O(m × n × 4^L), where L is the word length (bounded exploration per starting cell)
- Space: O(L) recursion depth
