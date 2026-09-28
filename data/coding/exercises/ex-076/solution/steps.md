**Pattern: Topological Sort (DFS)**

Use DFS with 3 states per node: unvisited(0), visiting(1), visited(2). If we reach a "visiting" node, there's a cycle. Post-order DFS appends to result. Reverse at the end for topological order.
