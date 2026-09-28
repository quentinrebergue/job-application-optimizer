# Solution Approach: Edge Count Check + DFS (Track Parent to Avoid False Cycles)

## Pattern Recognition
→ **DFS** — a valid tree is a graph that is both fully connected and acyclic. A quick necessary condition (exactly `n - 1` edges) plus one DFS that never revisits a node except through its own parent edge confirms both properties at once.

## Steps

1. If `len(edges) != n - 1`, return `False` immediately — a tree on `n` nodes has exactly `n - 1` edges (too few means disconnected, too many means a cycle).
2. Build an undirected adjacency list.
3. DFS from node `0`, passing along the `parent` node: mark the current node visited, and for each neighbor other than `parent`, if it's already visited that's a cycle (return `False`); otherwise recurse.
4. After the DFS, check that all `n` nodes were visited (confirms full connectivity, not just an acyclic subgraph).

## Why This Works
Excluding the edge back to `parent` is what distinguishes "a cycle" from "walking back along the same edge we just came from" in an undirected graph — without it, every edge would look like a 2-node cycle. The `n - 1` edge count combined with full reachability from a single DFS is a tight, sufficient certificate that the graph is exactly one tree.

## Complexity
- Time: O(V + E)
- Space: O(V + E)
