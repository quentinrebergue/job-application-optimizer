# Solution Approach: DFS from Every Unvisited Node

## Pattern Recognition
→ **DFS** — each time a DFS starts from a node that hasn't been visited yet, it fully explores (and marks) one entire connected component. The number of times we have to start a *fresh* DFS is exactly the number of components.

## Steps

1. Build an undirected adjacency list from `edges`.
2. Initialize a `visited` set and `count = 0`.
3. For each node `0..n-1`:
   - If it's not in `visited`, increment `count` and run a DFS from it, marking every node it reaches as visited.
4. Return `count`.

## Why This Works
DFS from a node visits precisely the set of nodes reachable from it — i.e. its whole connected component. Once a component is fully marked visited, no later starting node from within it will trigger another DFS, so `count` increments exactly once per component.

## Complexity
- Time: O(V + E)
- Space: O(V + E)
