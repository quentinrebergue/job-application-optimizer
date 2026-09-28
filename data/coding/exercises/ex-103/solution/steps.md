# Solution Approach: DFS Cycle Detection

## Pattern Recognition
→ **DFS** — courses and prerequisites form a directed graph; you can finish everything exactly when that graph has no cycle. A three-color DFS (unvisited / visiting / done) detects a cycle by catching a back-edge into a node still on the current recursion stack.

## Steps

1. Build an adjacency list: for each `[a, b]`, add an edge `b -> a` (finish `b` before `a`).
2. Track a `state` array: `0 = unvisited`, `1 = visiting` (on the current DFS stack), `2 = done`.
3. Define `dfs(u)`:
   - If `state[u] == 1`, we've looped back onto the current path — return `False` (cycle).
   - If `state[u] == 2`, already fully explored and safe — return `True`.
   - Mark `state[u] = 1`, recurse into every neighbor; if any returns `False`, propagate `False`.
   - Mark `state[u] = 2` and return `True`.
4. Run `dfs` from every course; if any call returns `False`, the whole schedule is impossible.

## Why This Works
A cycle exists if and only if DFS revisits a node that is still "in progress" (on the current call stack) rather than already fully resolved. Marking nodes `done` after they're fully explored also avoids redundant re-exploration of shared sub-graphs.

## Complexity
- Time: O(V + E)
- Space: O(V + E)
