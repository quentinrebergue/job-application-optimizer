# Solution Approach: Trie-Guided Backtracking

## Pattern Recognition
→ **Backtracking** — running Word Search separately for each word would re-scan the board once per word. Instead, merge all words into a single trie and backtrack through the board *and* the trie in lockstep, so shared prefixes are explored only once.

## Steps

1. Build a trie of all `words`; mark each terminal node with the full word it completes.
2. For every starting cell `(r, c)`, run `dfs(r, c, root)`:
   - If `board[r][c]` isn't a child of the current trie node, stop this branch.
   - Descend into that child; if it marks a complete word, record it (and clear the marker so it isn't added twice).
   - Mark the cell visited (e.g. `'#'`), recurse into the 4 neighbors with the child trie node, then restore the cell (backtrack).
   - Optionally prune the trie node once it has no children left — keeps later searches faster.
3. Return all collected words.

## Why This Works
Words sharing a prefix (like "eat" and "eats") share the same trie path, so the backtracking exploration for that shared prefix happens only once instead of once per word. The visited-cell marking and restoration is the same undo-on-backtrack mechanism as plain Word Search, just now driven by trie transitions instead of a fixed target string.

## Complexity
- Time: O(m × n × 4^L), where L is the longest word (bounded further by trie pruning in practice)
- Space: O(total characters in `words`) for the trie, plus O(L) recursion depth
