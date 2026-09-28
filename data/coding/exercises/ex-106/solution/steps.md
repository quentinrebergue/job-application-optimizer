# Solution Approach: Build Graph from Adjacent Words, then DFS Topological Sort

## Pattern Recognition
→ **DFS** — comparing each pair of adjacent (already-sorted) words reveals one letter-ordering constraint: the first character where they differ must come before the other. That set of constraints is a directed graph; any valid alien alphabet is a topological order of it.

## Steps

1. Initialize an adjacency set for every letter that appears in `words`.
2. For each pair of adjacent words `(w1, w2)`:
   - If `w1` is longer than `w2` but shares `w2` as a prefix, no valid order exists — return `""` (e.g. `"abc"` before `"ab"` is impossible).
   - Otherwise, find the first index where `w1` and `w2` differ and add the edge `w1[i] -> w2[i]`; then stop comparing this pair (later characters carry no ordering information).
3. Run the same 3-state DFS cycle-detection/topological-sort used for Course Schedule: `unvisited / visiting / done`, appending each letter to `order` once its own DFS is fully done.
4. If any DFS call detects a cycle, return `""`.
5. Reverse `order` (post-order DFS naturally comes out backwards) and join into a string.

## Why This Works
Lexicographic order between two adjacent words is fully determined by their *first differing character* — everything after that is irrelevant to the ordering. Collecting one edge per adjacent pair therefore captures every constraint implied by the dictionary, and a topological sort of those constraints is exactly a valid alphabet (or proves none exists, if there's a cycle).

## Complexity
- Time: O(C), where C is the total number of characters across all words
- Space: O(1) extra beyond the graph (at most 26 letters)
